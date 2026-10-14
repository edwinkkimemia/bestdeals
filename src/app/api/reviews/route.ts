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
    // The badge must be earned by YOUR purchase: signed-in buyer id, or the
    // guest checkout phone matching this account. Anyone else gets a 403, so
    // a paid order can't be borrowed for a fake "verified purchase".
    const ownsOrder =
      (order.buyerId && order.buyerId === user.id) ||
      (!order.buyerId && order.phone && fresh && order.phone === fresh.phone);
    if (!ownsOrder) return NextResponse.json({ error: "That order isn't yours." }, { status: 403 });
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
    authorId: user.id,
    authorName: fresh?.name ?? user.name,
    rating: d.rating,
    body: d.body || undefined,
    verifiedPurchase,
  });
  return NextResponse.json({ ok: true, id: rec.id, status: "pending", verifiedPurchase });
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "review:get"), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
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
    // Pending reviews are sensitive: exact-phone alone is enumerable, so guests
    // must pass the OTP check (see lib/otp) — no legacy bypass here.
    const { isPhoneVerified } = await import("@/lib/otp");
    const phoneMine = o && phone && o.phone === phone && (await isPhoneVerified(phone).catch(() => false));
    if (mine || phoneMine) return NextResponse.json({ review: r, items: [r] });
    return NextResponse.json({ review: null, items: [] });
  }
  return NextResponse.json({ items: [] });
}

/** Author edit + seller response + helpful votes — all ownership-checked. */
export async function PATCH(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "review:patch"), { limit: 30, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, body: text, rating, sellerResponse, helpful } = body as { id?: string; body?: string; rating?: number; sellerResponse?: string; helpful?: boolean };
  if (!id) return NextResponse.json({ error: "Missing review id." }, { status: 400 });
  const store = getStore();
  const target = await store.getReview(id).catch(() => null);
  if (!target) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (helpful) {
    // One vote per account — no stuffing. Legacy rows stored a bare number;
    // new rows store voter ids, and the count never drops below the legacy max.
    const vkey = `review_helpful_voters:${id}`;
    const voters = ((await store.getSetting(vkey).catch(() => null)) as string[] | null) ?? [];
    if (!voters.includes(user.id)) {
      voters.push(user.id);
      await store.setSetting(vkey, voters.slice(0, 5000)).catch(() => {});
    }
    const legacy = await store.getSetting(`review_helpful:${id}`).catch(() => null);
    const count = Math.max(typeof legacy === "number" ? legacy : 0, voters.length);
    await store.setSetting(`review_helpful:${id}`, { count }).catch(() => {});
    return NextResponse.json({ ok: true, helpful: count });
  }
  if (sellerResponse !== undefined) {
    // The reviewed seller (or an admin) only — never a random account.
    if (!(await canRespondToReview(user, target))) {
      return NextResponse.json({ error: "Only the reviewed seller can respond." }, { status: 403 });
    }
    await store.setSetting(`review_response:${id}`, { by: user.id, text: String(sellerResponse).slice(0, 1000), at: new Date().toISOString() }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  // Author edit: the recorded author account only (legacy rows fall back to
  // the order's buyer). Edits land on the review itself, not a side setting.
  if (text !== undefined || rating !== undefined) {
    if (!(await isReviewAuthor(user, target))) {
      return NextResponse.json({ error: "Only the author can edit this review." }, { status: 403 });
    }
    const patch: { body?: string; rating?: number } = {};
    if (typeof text === "string") patch.body = text.slice(0, 1000);
    if (typeof rating === "number" && rating >= 1 && rating <= 5) patch.rating = Math.round(rating);
    const updated = await store.updateReview(id, patch);
    if (!updated) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}

/** Author delete (own review) / admin remove — both flip to rejected (unserved). */
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
  const target = await store.getReview(id).catch(() => null);
  if (!target) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (!(await isReviewAuthor(user, target))) {
    return NextResponse.json({ error: "Only the author can delete this review." }, { status: 403 });
  }
  await store.setReviewStatus(id, "rejected").catch(() => {});
  return NextResponse.json({ ok: true });
}

type ReviewTarget = {
  id: string;
  authorId?: string;
  orderId?: string;
  listingId?: string;
  shopSlug?: string;
  sellerName?: string;
};

/** True when the user wrote the review (recorded author, else the order's buyer). */
async function isReviewAuthor(
  user: { id: string; name: string },
  target: ReviewTarget
): Promise<boolean> {
  if (target.authorId) return target.authorId === user.id;
  if (target.orderId) {
    const order = await getStore().getOrder(target.orderId).catch(() => null);
    if (order && (order as { buyerId?: string }).buyerId) {
      return (order as { buyerId?: string }).buyerId === user.id;
    }
  }
  return false;
}

/** True for admins, the listing owner/shop staff, or the named seller account. */
async function canRespondToReview(
  user: { id: string; role: string; name: string },
  target: ReviewTarget
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const store = getStore();
  if (target.listingId) {
    const listing = await store.getListing(target.listingId).catch(() => null);
    if (listing) {
      const { canManageListing } = await import("@/lib/gate");
      if (await canManageListing(user, listing)) return true;
    }
  }
  if (target.shopSlug) {
    const members = await store.listShopMembers(target.shopSlug).catch(() => []);
    if (members.some((m) => m.userId === user.id)) return true;
  }
  if (target.sellerName) {
    const me = await store.findUserById(user.id).catch(() => null);
    const needle = target.sellerName.trim().toLowerCase();
    if (
      me &&
      (me.name.trim().toLowerCase() === needle ||
        (me.businessName ?? "").trim().toLowerCase() === needle)
    ) {
      return true;
    }
  }
  return false;
}
