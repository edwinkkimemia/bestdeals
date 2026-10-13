import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { boostProductById } from "@/data/catalog";
import { initiateSTKPush } from "@/lib/payments";
import { formatKES } from "@/lib/format";

const buySchema = z.object({
  listingId: z.string().min(1),
  productId: z.string().min(1),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/, "Use a valid Kenyan phone e.g. 0712345678").optional(),
});

/** My promotions (receipts + statuses). Expired boosts settle first so lists read true. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const store = getStore();
  await store.sweepExpiredPromotions().catch(() => null);
  const items = await store.listPromotionsForOwner(user.id).catch(() => []);
  return NextResponse.json({ items });
}

/**
 * Buy a Featured boost for an eligible listing (active + has photo).
 * Creates a pending_payment promotion and initiates M-Pesa STK push.
 * Amount always comes from the server-side boost catalogue — never the browser.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `promo:${user.id}`), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = buySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });

  const store = getStore();
  await store.sweepExpiredPromotions().catch(() => null);
  const fresh = await store.findUserById(user.id).catch(() => null);
  const listing = await store.getListing(parsed.data.listingId);
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (listing.ownerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not your listing." }, { status: 403 });
  }
  if (listing.status !== "active") {
    return NextResponse.json({ error: "Only moderation-approved (active) listings can be boosted." }, { status: 422 });
  }
  if (listing.images.length === 0) {
    return NextResponse.json({ error: "Add at least one photo before boosting." }, { status: 422 });
  }
  const product = boostProductById(parsed.data.productId);
  if (!product) return NextResponse.json({ error: "Unknown boost product." }, { status: 400 });

  const promo = await store.createPromotion({
    listingId: listing.id,
    ownerId: user.id,
    kind: product.kind,
    days: product.days,
    amount: product.price,
  });

  // Wallet-first: spend balance when it covers the boost (Jiji Balance-style).
  const { getBalance, debitWallet } = await import("@/lib/wallet");
  const bal = await getBalance(user.id).catch(() => 0);
  if (bal >= product.price && product.price > 0) {
    const spent = await debitWallet(user.id, product.price, "boost", `${product.name} ${listing.id}`);
    if (spent.ok) {
      await store.activatePromotion(promo.id).catch(() => {});
      await store.setListingFeatured(listing.id, true).catch(() => {});
      return NextResponse.json({
        ok: true,
        promotion: { ...(await store.getPromotion(promo.id).catch(() => promo)), },
        payment: { status: "paid", message: `Paid from wallet balance (${spent.balance} KES left).`, providerRef: undefined },
        summary: `${product.name} for "${listing.title}" — ${formatKES(product.price)}. Paid from wallet.`,
      });
    }
  }

  const phone = parsed.data.phone ?? fresh?.phone ?? user.phone;
  const payment = await initiateSTKPush({ orderId: promo.id, amount: product.price, phone, method: "mpesa", label: "boost" });
  if (payment.status === "processing" && payment.providerRef) {
    await store.setSetting(`mpesa_link:${payment.providerRef}`, { promoId: promo.id }).catch(() => {});
  }
  // Free/zero-amount promos (referral rewards) activate immediately.
  if (product.price === 0) {
    await store.activatePromotion(promo.id).catch(() => {});
  }
  return NextResponse.json({
    ok: true,
    promotion: promo,
    payment: { status: payment.status, message: payment.message, providerRef: payment.providerRef },
    summary: `${product.name} for "${listing.title}" — ${formatKES(product.price)}. ${payment.message}`,
  });
}
