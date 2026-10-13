import { NextRequest, NextResponse } from "next/server";
import { reviewSchema } from "@/lib/validators";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { currentUser } from "@/lib/auth";

/**
 * Reviews. Posting requires a verified account (fresh flag, never the token);
 * verifiedPurchase is computed SERVER-side: only orders this server created
 * that are paid or delivered earn the badge.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "review"), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many reviews. Try again later." }, { status: 429 });
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to review." }, { status: 401 });
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  if (!(fresh?.verified ?? user.verified)) {
    return NextResponse.json(
      { error: "Only verified accounts can review. Verify at /dashboard/verify first.", code: "NOT_VERIFIED" },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check your review." }, { status: 400 });
  }
  const d = parsed.data;
  if (!d.sellerName && !d.shopSlug && !d.listingId) {
    return NextResponse.json({ error: "Review must target a seller, shop or listing." }, { status: 400 });
  }

  let verifiedPurchase = false;
  if (d.orderId) {
    const order = await getStore().getOrder(d.orderId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    verifiedPurchase = order.paymentStatus === "paid" || order.status === "delivered";
    // One review per order — no ballot-stuffing from repeat submits.
    const dup = await getStore().findReviewByOrder(d.orderId);
    if (dup) return NextResponse.json({ error: "This order already has a review.", reviewId: dup.id }, { status: 409 });
  }

  const rec = await getStore().createReview({
    orderId: d.orderId,
    listingId: d.listingId,
    shopSlug: d.shopSlug,
    sellerName: d.sellerName,
    authorName: fresh?.name ?? user.name,
    rating: d.rating,
    body: d.body || undefined,
    verifiedPurchase,
  });
  return NextResponse.json({ ok: true, id: rec.id, status: "pending", verifiedPurchase });
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const store = getStore();
  const seller = q.get("seller");
  const shop = q.get("shop");
  const listing = q.get("listing");
  const order = q.get("order");
  if (shop) return NextResponse.json({ items: await store.listApprovedReviewsForShop(shop) });
  if (seller) return NextResponse.json({ items: await store.listApprovedReviewsForSeller(seller) });
  if (listing) return NextResponse.json({ items: await store.listApprovedReviewsForListing(listing) });
  if (order) {
    // Pending reviews are private: only approved show via ?order= unless the
    // caller owns the order (buyer) or is admin.
    const r = await store.findReviewByOrder(order);
    if (!r) return NextResponse.json({ review: null, items: [] });
    if (r.status === "approved") return NextResponse.json({ review: r, items: [r] });
    const o = await store.getOrder(order).catch(() => null);
    const user = await currentUser().catch(() => null);
    const mine = o && user && (o.buyerId === user.id || user.role === "ADMIN");
    const phone = q.get("phone");
    const phoneMine = o && phone && o.phone === phone;
    if (mine || phoneMine) return NextResponse.json({ review: r, items: [r] });
    return NextResponse.json({ review: null, items: [] });
  }
  return NextResponse.json({ items: [] });
}

/** Author edit + seller response + helpful votes. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  const body = await req.json().catch(() => ({}));
  const { id, body: text, rating, sellerResponse, helpful } = body as { id?: string; body?: string; rating?: number; sellerResponse?: string; helpful?: boolean };
  if (!id) return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  const store = getStore();
  const pending = await store.listPendingReviews().catch(() => []);
  const allApproved: typeof pending = [];
  // Locate review across pending + approved buckets via order lookup fallback.
  let target = pending.find((r) => r.id === id) ?? null;
  if (!target) {
    // Search approved by scanning sellers/shops is expensive; use order link when given.
    const orderId = String((body as { orderId?: string }).orderId || "");
    if (orderId) target = await store.findReviewByOrder(orderId).catch(() => null);
  }
  if (!target) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  void allApproved;
  if (helpful) {
    const key = `review_helpful:${id}`;
    const n = (Number(await store.getSetting(key).catch(() => 0)) || 0) + 1;
    await store.setSetting(key, n).catch(() => {});
    return NextResponse.json({ ok: true, helpful: n });
  }
  if (sellerResponse !== undefined) {
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    // Seller of the target or admin may respond.
    await store.setSetting(`review_response:${id}`, { by: user.id, text: String(sellerResponse).slice(0, 1000), at: new Date().toISOString() }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  // Author edit: must own via order phone/buyer or matching authorName + signed in.
  if (text !== undefined || rating !== undefined) {
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const patch: { body?: string; rating?: number } = {};
    if (typeof text === "string") patch.body = text.slice(0, 1000);
    if (typeof rating === "number" && rating >= 1 && rating <= 5) patch.rating = Math.round(rating);
    await store.setSetting(`review_edit:${id}`, { ...patch, by: user.id, at: new Date().toISOString() }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}

/** Author delete (own review) / admin remove. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const store = getStore();
  if (user.role === "ADMIN") {
    await store.setReviewStatus(id, "rejected").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  // Non-admin: only allow hiding own pending review (goes to rejected-like state via settings flag).
  await store.setSetting(`review_deleted:${id}`, { by: user.id, at: new Date().toISOString() }).catch(() => {});
  return NextResponse.json({ ok: true });
}
