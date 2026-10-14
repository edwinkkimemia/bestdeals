import { NextRequest, NextResponse } from "next/server";
import { validateMpesaCallback, resolveMpesaOrderId, verifyCallbackSecret, isCallbackAuthEnforced } from "@/lib/payments";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";

type PlanLink = { promoId?: string; planShop?: string; planUser?: string; planId?: string };

/**
 * Public Daraja callback URL: POST /api/payments/mpesa-callback
 * Verifies amount against the server-side order total, writes the ledger
 * idempotently (unique providerRef), then transitions pending → paid.
 * Activates linked promotions/plans stored alongside the request map —
 * including boost/plan checkouts, which carry promo/plan ids (not order
 * ids) and must NOT be gated on finding an order row.
 *
 * Authenticity: Daraja sends no signature, so production must set
 * MPESA_CALLBACK_SECRET (checked as ?key=). Without it the URL is open to
 * anyone who guesses an order id — see docs/providers.md.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "mpesa:cb"), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ ResultCode: 1, ResultDesc: "Rate limited" }, { status: 429 });
  if (!verifyCallbackSecret(req.url)) {
    await logAudit({ action: "payment.callback_forbidden", entity: "order", entityId: "unknown", reason: "bad callback key" }).catch(() => {});
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Forbidden" }, { status: 403 });
  }
  if (!isCallbackAuthEnforced()) {
    console.warn("[payments] MPESA_CALLBACK_SECRET unset — callback URL is open. Set it in production.");
  }
  const body = await req.json().catch(() => null);
  const v = validateMpesaCallback(body);
  if (!v.valid) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
  if (v.resultCode !== 0 || !v.providerRef) {
    if (v.orderRef) {
      const mapped: { orderId?: string; amount?: number } = await resolveMpesaOrderId(v.orderRef).catch(() => ({}));
      if (mapped.orderId) {
        await getStore().setOrderPayment(mapped.orderId, "failed").catch(() => {});
        await restoreStockForOrder(mapped.orderId).catch(() => {});
        await logAudit({ action: "payment.failed", entity: "order", entityId: mapped.orderId, reason: `result=${v.resultCode}` }).catch(() => {});
      }
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Recorded as failed" });
  }
  const store = getStore();
  const mapped: { orderId?: string; amount?: number } = v.orderRef ? await resolveMpesaOrderId(v.orderRef).catch(() => ({})) : {};
  const orderId = mapped.orderId || v.orderRef || "unknown";
  // Wallet top-ups resolve to WALLET-* ids — credit the wallet instead of an order.
  if (orderId.startsWith("WALLET-")) {
    const top = (await store.getSetting(`wallet_topup:${orderId}`).catch(() => null)) as { userId?: string; amount?: number } | null;
    if (top?.userId && v.amount !== undefined && v.amount === (mapped.amount ?? top.amount)) {
      const { creditWallet } = await import("@/lib/wallet");
      await creditWallet(top.userId, v.amount, "topup", v.providerRef).catch(() => {});
      await store.setSetting(`wallet_topup:${orderId}`, null).catch(() => {});
    }
    await store.recordPayment({ orderId, method: "mpesa", amount: v.amount ?? 0, status: "paid", providerRef: v.providerRef }).catch(() => {});
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  // Direct id fallback: AccountReference is our order id prefix (first 20 chars).
  const { duplicate } = await store.recordPayment({
    orderId,
    method: "mpesa",
    amount: v.amount ?? mapped.amount ?? 0,
    status: "paid",
    providerRef: v.providerRef,
  });
  // Replays must never re-fire fulfillment (e.g. re-extend a boost window).
  if (duplicate) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted (duplicate)" });
  if (orderId !== "unknown") {
    const order = await store.getOrder(orderId);
    if (order) {
      const expected = mapped.amount ?? order.total;
      if (v.amount !== undefined && v.amount !== expected) {
        await store.setOrderPayment(order.id, "failed").catch(() => {});
        await restoreStockForOrder(order.id).catch(() => {});
        await logAudit({ action: "payment.amount_mismatch", entity: "order", entityId: order.id, reason: `got=${v.amount} want=${expected}` }).catch(() => {});
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Amount mismatch recorded" });
      }
      if (order.paymentStatus !== "paid") {
        await store.setOrderPayment(order.id, "paid", v.providerRef);
        await store.setOrderStatus(order.id, "confirmed");
      }
    }
  }
  // Fulfil linked promo/plan checkouts (boost + shop/seller plans carry their
  // own ids, so this runs whether or not an order row exists).
  await fulfilLinkedPurchase(v, store).catch(() => {});
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

/** Release reserved stock when an order will never be paid. Best-effort. */
async function restoreStockForOrder(orderId: string): Promise<void> {
  const { restoreReservedStock } = await import("@/lib/stock");
  await restoreReservedStock(orderId).catch(() => {});
}

/** Activate a promotion/plan linked to a Daraja request id, amount-checked. */
async function fulfilLinkedPurchase(
  v: { orderRef?: string; checkoutRequestId?: string; amount?: number; providerRef?: string },
  store: ReturnType<typeof getStore>
): Promise<void> {
  const refs = [...new Set([v.checkoutRequestId, v.orderRef].filter(Boolean))] as string[];
  let link: PlanLink | null = null;
  for (const ref of refs) {
    link = (await store.getSetting(`mpesa_link:${ref}`).catch(() => null)) as PlanLink | null;
    if (link && (link.promoId || link.planShop || link.planUser)) break;
    link = null;
  }
  if (!link) return;
  const amountOk = (expected: number | undefined) =>
    v.amount === undefined || expected === undefined || v.amount === expected;
  if (link.promoId) {
    const promo = await store.getPromotion(link.promoId).catch(() => null);
    if (!promo) return;
    if (!amountOk((promo as { amount?: number }).amount)) {
      await logAudit({ action: "payment.amount_mismatch", entity: "promotion", entityId: link.promoId, reason: `got=${v.amount}` }).catch(() => {});
      return;
    }
    await store.activatePromotion(link.promoId).catch(() => {});
    return;
  }
  const { pendingPlanKey, pendingSellerPlanKey } = await import("@/lib/plans");
  const settleInvoice = async (invoiceId?: string) => {
    if (!invoiceId) return;
    const inv = ((await store.getSetting("invoices").catch(() => null)) as { id: string }[] | null) ?? [];
    await store
      .setSetting(
        "invoices",
        inv.map((i) => (i.id === invoiceId ? { ...i, status: "paid", providerRef: v.providerRef } : i))
      )
      .catch(() => {});
  };
  if (link.planShop && link.planId) {
    const pending = (await store.getSetting(pendingPlanKey(link.planShop)).catch(() => null)) as { amount?: number; invoiceId?: string } | null;
    if (pending && !amountOk(pending.amount)) {
      await logAudit({ action: "payment.amount_mismatch", entity: "shop", entityId: link.planShop, reason: `got=${v.amount}` }).catch(() => {});
      return;
    }
    await store.setShopPlan(link.planShop, link.planId).catch(() => {});
    await store.setSetting(pendingPlanKey(link.planShop), null).catch(() => {});
    await settleInvoice(pending?.invoiceId);
    return;
  }
  if (link.planUser && link.planId) {
    const pending = (await store.getSetting(pendingSellerPlanKey(link.planUser)).catch(() => null)) as { amount?: string | number; invoiceId?: string } | null;
    const expected = typeof pending?.amount === "number" ? pending.amount : undefined;
    if (pending && !amountOk(expected)) {
      await logAudit({ action: "payment.amount_mismatch", entity: "user", entityId: link.planUser, reason: `got=${v.amount}` }).catch(() => {});
      return;
    }
    await store.setUserPlan(link.planUser, link.planId).catch(() => {});
    await store.setSetting(pendingSellerPlanKey(link.planUser), null).catch(() => {});
    await settleInvoice(pending?.invoiceId);
  }
}
