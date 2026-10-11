import { NextRequest, NextResponse } from "next/server";
import { listingSchema } from "@/lib/validators";
import { currentUser } from "@/lib/auth";
import { requireVerifiedSeller } from "@/lib/gate";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Listing intake: verified sellers only; validates, spam-checks, queues for moderation. */
export async function POST(req: NextRequest) {
  const gate = await requireVerifiedSeller();
  if (!gate.ok) return gate.response;
  const user = gate.seller;
  const rl = rateLimit(clientKey(req, `list:${user.id}`), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Listing limit reached for now. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form and try again." }, { status: 400 });
  }
  const d = parsed.data;
  if (d.compareAt && d.compareAt <= d.price) {
    return NextResponse.json({ error: "Previous price must be higher than the current price, or left empty." }, { status: 400 });
  }
  // Banned-word pre-screen (full moderation queue in admin)
  const banned = ["counterfeit", "stolen", "pyramid", "quick loan"];
  const hay = `${d.title} ${d.description}`.toLowerCase();
  if (banned.some((w) => hay.includes(w))) {
    return NextResponse.json({ error: "This listing needs manual review due to a flagged term. Our team will check it." }, { status: 422 });
  }
  const rec = await getStore().createListing({
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
    images: (d.images ?? []).filter((u) => u.startsWith("https://") || u.startsWith("/uploads/")).slice(0, 8),
    attributes: d.attributes ?? {},
    ownerId: user.id,
    sellerName: user.name,
    // Snapshot of the verified number — WhatsApp ordering always uses this.
    sellerPhone: user.phone,
    categorySlug: d.categorySlug,
    subcategory: (d.subcategory ?? "").trim() || undefined,
  });
  return NextResponse.json({ ok: true, id: rec.id, status: "pending", message: "Saved and queued for moderation." });
}

/** Seller's own listings (used by the dashboard). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const items = await getStore().listListingsByOwner(user.id);
  return NextResponse.json({ items });
}
