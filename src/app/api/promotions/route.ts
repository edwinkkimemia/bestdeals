import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { boostProductById } from "@/data/catalog";
import { initiateSTKPush } from "@/lib/payments";
import { formatKES } from "@/lib/format";
import { invoicePromoId, recordPromotionInvoice } from "@/lib/invoices";
import { sendInvoiceEmailById } from "@/lib/invoice-email";

const buySchema = z.object({
  listingId: z.string().min(1),
  productId: z.string().min(1),
  // Required up front: without it the STK push is guaranteed to fail and the
  // promo strands in pending_payment with no retry path.
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/, "Use a valid Kenyan phone e.g. 0712345678"),
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

  // One boost at a time per product: no stacking before the current window
  // expires, and no duplicate payment prompts while one is pending.
  const existingPromos = await store.listPromotionsByListing(listing.id);
  const livePromo = existingPromos.find(
    (p) => p.status === "active" && new Date(p.endsAt).getTime() > Date.now()
  );
  if (livePromo) {
    const until = new Date(livePromo.endsAt).toLocaleDateString("en-KE", {
      day: "numeric", month: "short", year: "numeric",
    });
    return NextResponse.json(
      { error: `This product is already promoted until ${until}. You can boost it again after that.` },
      { status: 409 }
    );
  }
  const pendingPromo = existingPromos.find((p) => p.status === "pending_payment");
  if (pendingPromo) {
    return NextResponse.json(
      { error: "A boost payment is already pending for this product. Complete the M-Pesa prompt, or cancel it below before trying again." },
      { status: 409 }
    );
  }

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
      await recordPromotionInvoice({
        promo: (await store.getPromotion(promo.id).catch(() => promo)) ?? promo,
        ownerId: user.id,
        ownerName: fresh?.businessName || fresh?.name || user.name,
        ownerEmail: fresh?.email || user.email,
        listingTitle: listing.title,
        method: "wallet",
        status: "paid",
      }).catch(() => null);
      await sendInvoiceEmailById(invoicePromoId(promo.id), { reason: "paid", origin: req.nextUrl.origin }).catch(() => null);
      try {
        const { notifyUser } = await import("@/lib/notifications");
        await notifyUser({
          userId: user.id,
          type: "promotion",
          title: "Boost is live 🚀",
          body: `${product.name} for “${listing.title.slice(0, 80)}” is active for ${product.days}d.`,
          link: "/dashboard/promotion",
        });
      } catch {}
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
    try {
      const { notifyUser } = await import("@/lib/notifications");
      await notifyUser({
        userId: user.id,
        type: "promotion",
        title: "Boost is live 🚀",
        body: `${product.name} for “${listing.title.slice(0, 80)}” is active for ${product.days}d.`,
        link: "/dashboard/promotion",
      });
    } catch {}
  }
  const free = product.price === 0;
  await recordPromotionInvoice({
    promo: free ? (await store.getPromotion(promo.id).catch(() => promo)) ?? promo : promo,
    ownerId: user.id,
    ownerName: fresh?.businessName || fresh?.name || user.name,
    ownerEmail: fresh?.email || user.email,
    listingTitle: listing.title,
    method: free ? "referral" : "mpesa",
    status: free ? "paid" : "pending",
    providerRef: payment.providerRef,
  }).catch(() => null);
  await sendInvoiceEmailById(invoicePromoId(promo.id), {
    reason: free ? "paid" : "created",
    origin: req.nextUrl.origin,
  }).catch(() => null);
  return NextResponse.json({
    ok: true,
    promotion: promo,
    payment: { status: payment.status, message: payment.message, providerRef: payment.providerRef },
    summary: `${product.name} for "${listing.title}" — ${formatKES(product.price)}. ${payment.message}`,
  });
}
