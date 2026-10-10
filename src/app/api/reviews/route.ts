import { NextRequest, NextResponse } from "next/server";
import { reviewSchema } from "@/lib/validators";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Reviews. verifiedPurchase is computed SERVER-side: only orders this server
 * created that are paid or delivered earn the badge. Everything else shows as
 * an unverified community review — never fabricated.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "review"), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many reviews. Try again later." }, { status: 429 });
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
  }

  const rec = await getStore().createReview({
    orderId: d.orderId,
    listingId: d.listingId,
    shopSlug: d.shopSlug,
    sellerName: d.sellerName,
    authorName: d.authorName,
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
  if (shop) return NextResponse.json({ items: await store.listApprovedReviewsForShop(shop) });
  if (seller) return NextResponse.json({ items: await store.listApprovedReviewsForSeller(seller) });
  return NextResponse.json({ items: [] });
}
