import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSeller } from "@/lib/gate";
import { getStore } from "@/lib/store";
import { listingSchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getSellerPlan, goldRequiredMessage } from "@/lib/plans";
import { categoryBySlug } from "@/data/catalog";
import { resolveCounty, townsFor } from "@/lib/kenya";
import { parseCSV } from "@/lib/csv";

const MAX_ROWS = 200;
const CONDITIONS = ["new", "like_new", "used_good", "used_fair", "refurbished"] as const;
const TYPES = ["product", "classified", "service"] as const;
const TX = ["buy_online", "contact_seller", "request_quote", "enquiry"] as const;
const BANNED = ["counterfeit", "stolen", "pyramid", "quick loan"];

/**
 * Bulk catalogue upload — Gold plan only. CSV columns:
 * title,description,category,price,stock,condition,county,town
 * (+ optional subcategory,listingType,transactionMethod,compareAt,negotiable).
 * Every row goes through the same validation + moderation queue as single posts.
 */
export async function POST(req: NextRequest) {
  const gate = await requireVerifiedSeller();
  if (!gate.ok) return gate.response;
  const user = gate.seller;
  const rl = rateLimit(clientKey(req, `bulk:${user.id}`), { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many bulk uploads. Try again later." }, { status: 429 });

  const plan = await getSellerPlan(user.id);
  if (plan.planId !== "gold") {
    return NextResponse.json({ error: goldRequiredMessage("Bulk CSV upload"), code: "PLAN_GOLD" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const text =
    typeof file === "string"
      ? file
      : file instanceof Blob
        ? await file.text().catch(() => "")
        : "";
  if (!text.trim()) return NextResponse.json({ error: "Attach a CSV file first." }, { status: 400 });

  const rows = parseCSV(text);
  if (rows.length < 2) return NextResponse.json({ error: "CSV needs a header row plus at least one listing row." }, { status: 400 });
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  for (const required of ["title", "description", "category", "price", "condition", "county", "town"]) {
    if (idx(required) === -1) {
      return NextResponse.json({ error: `Missing column: ${required}. Download the CSV template to see the format.` }, { status: 400 });
    }
  }
  const data = rows.slice(1, MAX_ROWS + 1);
  const store = getStore();
  const created: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const lineNo = i + 2;
    const cell = (name: string) => (idx(name) === -1 ? "" : (r[idx(name)] ?? "").trim());
    try {
      const categorySlug = cell("category");
      if (!categoryBySlug(categorySlug)) throw new Error(`Unknown category "${categorySlug || "—"}".`);
      const county = resolveCounty(cell("county"));
      if (county === "all") throw new Error(`Unknown county "${cell("county") || "—"}".`);
      const town = cell("town");
      if (!townsFor(county).some((t) => t.toLowerCase() === town.toLowerCase())) {
        throw new Error(`"${town || "—"}" is not a listed town in ${county}.`);
      }
      const condition = cell("condition") || "new";
      if (!(CONDITIONS as readonly string[]).includes(condition)) {
        throw new Error(`Condition must be one of: ${CONDITIONS.join(", ")}.`);
      }
      const listingType = cell("listingtype") || "product";
      if (!(TYPES as readonly string[]).includes(listingType)) {
        throw new Error(`listingType must be one of: ${TYPES.join(", ")}.`);
      }
      const txMethod = cell("transactionmethod") || "buy_online";
      if (!(TX as readonly string[]).includes(txMethod)) {
        throw new Error(`transactionMethod must be one of: ${TX.join(", ")}.`);
      }
      const price = Number(cell("price"));
      const stock = cell("stock") === "" ? 1 : Number(cell("stock"));
      const compareAt = cell("compareat") === "" ? null : Number(cell("compareat"));
      const parsed = listingSchema.safeParse({
        title: cell("title"),
        description: cell("description"),
        categorySlug,
        subcategory: cell("subcategory"),
        price,
        compareAt,
        condition,
        listingType,
        county,
        town,
        negotiable: ["yes", "true", "1"].includes(cell("negotiable").toLowerCase()),
        transactionMethod: txMethod,
        stock,
        images: [],
        attributes: {},
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid row.");
      const d = parsed.data;
      if (d.compareAt && d.compareAt <= d.price) throw new Error("compareAt must be higher than price.");
      if (BANNED.some((w) => `${d.title} ${d.description}`.toLowerCase().includes(w))) {
        throw new Error("Flagged term — submit this row manually for review.");
      }
      const rec = await store.createListing({
        title: d.title,
        description: d.description,
        type: d.listingType,
        price: d.price,
        compareAt: d.compareAt ?? null,
        condition: d.condition,
        txMethod: d.transactionMethod,
        negotiable: d.negotiable,
        stock: d.stock,
        county: d.county,
        town: d.town,
        images: [],
        attributes: {},
        ownerId: user.id,
        sellerName: user.name,
        sellerPhone: user.phone,
        categorySlug: d.categorySlug,
        shopSlug: plan.shopSlug,
      });
      created.push(rec.id);
    } catch (e) {
      errors.push({ row: lineNo, error: e instanceof Error ? e.message : "Invalid row." });
    }
  }
  // Job record for progress polling (async-compatible: clients poll ?jobId=).
  const { uid } = await import("@/lib/utils");
  const jobId = uid("bulk");
  await store.setSetting(`bulk:${jobId}`, { by: user.id, at: new Date().toISOString(), created: created.length, failed: errors.length, errors: errors.slice(0, 50) }).catch(() => {});
  return NextResponse.json({ ok: true, jobId, created: created.length, failed: errors.length, ids: created, errors: errors.slice(0, 50) });
}

/** Bulk job progress (poll after POST returns jobId). */
export async function GET(req: NextRequest) {
  const { currentUser } = await import("@/lib/auth");
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const jobId = new URL(req.url).searchParams.get("jobId") || "";
  if (!jobId) return NextResponse.json({ error: "jobId required." }, { status: 400 });
  const job = await getStore().getSetting(`bulk:${jobId}`).catch(() => null);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  return NextResponse.json({ job });
}
