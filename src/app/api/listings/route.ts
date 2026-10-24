import { NextRequest, NextResponse } from "next/server";
import { listingSchemaFor } from "@/lib/validators";
import { currentUser } from "@/lib/auth";
import { requireVerifiedSeller } from "@/lib/gate";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getSellerPlan, countLiveListings, planAllowsListings, limitMessage } from "@/lib/plans";
import { normalizeListingImages } from "@/lib/image-urls";
import { categorySelectionError, getCategories } from "@/lib/categories";

/** Listing intake: verified sellers only; validates, spam-checks, queues for moderation. */
export async function POST(req: NextRequest) {
  const gate = await requireVerifiedSeller();
  if (!gate.ok) return gate.response;
  const user = gate.seller;
  const store = getStore();
  // Retries (double-click, dropped response) carry the same key from the form.
  // Return the original listing instead of creating a second one.
  const createKey = (req.headers.get("idempotency-key") ?? "").trim().slice(0, 100);
  if (createKey) {
    const prior = (await store.getSetting(`listing:create:${user.id}:${createKey}`).catch(() => null)) as
      | { listingId?: string }
      | null;
    if (prior?.listingId) {
      const existing = await store.getListing(prior.listingId).catch(() => null);
      if (existing) {
        return NextResponse.json({
          ok: true,
          id: existing.id,
          status: existing.status,
          duplicate: true,
          message: "This listing was already submitted.",
        });
      }
    }
  }
  const rl = rateLimit(clientKey(req, `list:${user.id}`), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Listing limit reached for now. Try again later." }, { status: 429 });

  // Plan allowance: Free 5 · Silver 30 · Gold unlimited live listings.
  const plan = await getSellerPlan(user.id);
  const live = await countLiveListings(user.id);
  if (!planAllowsListings(plan.planId, live)) {
    return NextResponse.json({ error: limitMessage(plan.planId, live), code: "PLAN_LIMIT" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const categories = await getCategories();
  const parsed = listingSchemaFor(categories).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form and try again." }, { status: 400 });
  }
  const d = parsed.data;
  const categoryError = await categorySelectionError(d.categorySlug, d.subcategory);
  if (categoryError) return NextResponse.json({ error: categoryError }, { status: 400 });
  if (d.compareAt && d.compareAt <= d.price) {
    return NextResponse.json({ error: "Previous price must be higher than the current price, or left empty." }, { status: 400 });
  }
  // Banned-word pre-screen (full moderation queue in admin)
  const banned = ["counterfeit", "stolen", "pyramid", "quick loan"];
  const hay = `${d.title} ${d.description}`.toLowerCase();
  if (banned.some((w) => hay.includes(w))) {
    return NextResponse.json({ error: "This listing needs manual review due to a flagged term. Our team will check it." }, { status: 422 });
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
    images: normalizeListingImages(d.images),
    attributes: d.attributes ?? {},
    ownerId: user.id,
    sellerName: user.name,
    // Snapshot of the verified number — WhatsApp ordering always uses this.
    sellerPhone: user.phone,
    categorySlug: d.categorySlug,
    subcategory: (d.subcategory ?? "").trim() || undefined,
    shopSlug: plan.shopSlug,
  });
  if (createKey) {
    await store
      .setSetting(`listing:create:${user.id}:${createKey}`, {
        listingId: rec.id,
        at: new Date().toISOString(),
      })
      .catch(() => null);
  }
  // Jiji-style feed: confirm receipt so the bell explains the pending state.
  try {
    const { notifyUser } = await import("@/lib/notifications");
    await notifyUser({
      userId: user.id,
      type: "listing",
      title: "Listing under review",
      body: `“${d.title.slice(0, 80)}” was received and is queued for moderation. We’ll notify you once it’s live.`,
      link: `/dashboard/listings/${rec.id}`,
    });
  } catch {}
  return NextResponse.json({ ok: true, id: rec.id, status: "pending", message: "Saved and queued for moderation." });
}

/** Seller's own listings (used by the dashboard). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const items = await getStore().listListingsByOwner(user.id);
  return NextResponse.json({ items });
}
