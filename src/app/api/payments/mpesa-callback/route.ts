import { NextRequest, NextResponse } from "next/server";
import { validateMpesaCallback, resolveMpesaOrderId, verifyCallbackSecret, isCallbackAuthEnforced } from "@/lib/payments";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { fulfilLinkedPurchase } from "@/lib/mpesa-fulfilment";

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
    const key = `wallet_topup:${orderId}`;
    const top = (await store.getSetting(key).catch(() => null)) as { userId?: string; amount?: number } | null;
    const expected = mapped.amount ?? top?.amount;
    if (top?.userId && v.amount !== undefined && (expected === undefined || v.amount === expected)) {
      const { creditWallet } = await import("@/lib/wallet");
      await creditWallet(top.userId, v.amount, "topup", v.providerRef).catch(() => {});
      await store.setSetting(key, null).catch(() => {});
      await logAudit({ action: "payment.wallet_topup", entity: "user", entityId: top.userId, reason: `KES ${v.amount}` }).catch(() => {});
    } else if (top?.userId) {
      await logAudit({ action: "payment.amount_mismatch", entity: "user", entityId: top.userId, reason: `got=${v.amount} want=${expected}` }).catch(() => {});
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  // Order payments. Payment.orderId is an order FK, so promo/plan checkouts
  // (which have no Order row) must not be written to the payments table.
  const order = orderId !== "unknown" ? await store.getOrder(orderId) : null;
  if (order) {
    const { duplicate } = await store.recordPayment({
      orderId,
      method: "mpesa",
      amount: v.amount ?? mapped.amount ?? 0,
      status: "paid",
      providerRef: v.providerRef,
    });
    // Replays must never re-fire fulfilment (e.g. re-extend a boost window).
    // Still consume any linked promo/plan in case the first pass crashed
    // between the Payment write and fulfilment.
    if (duplicate) {
      await fulfilLinkedPurchase(v, store).catch(() => false);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted (duplicate)" });
    }
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
  } else {
    // No order row: this is a boost/plan purchase (or an unknown reference).
    // Use a receipt marker so a Daraja retry cannot re-run fulfilment.
    const callbackKey = v.providerRef ? `mpesa_cb:${v.providerRef}` : "";
    if (callbackKey && (await store.getSetting(callbackKey).catch(() => null))) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted (duplicate)" });
    }
  }
  // Fulfil linked promo/plan checkouts (boost + shop/seller plans carry their
  // own ids, so this runs whether or not an order row exists).
  const fulfilled = await fulfilLinkedPurchase(v, store).catch(() => false);
  if (!order && fulfilled && v.providerRef) {
    await store.setSetting(`mpesa_cb:${v.providerRef}`, { orderId, at: new Date().toISOString() }).catch(() => {});
  }
  if (!order && !fulfilled) {
    await logAudit({ action: "payment.unmatched", entity: "payment", entityId: orderId, reason: `providerRef=${v.providerRef ?? "?"}` }).catch(() => {});
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

/** Release reserved stock when an order will never be paid. Best-effort. */
async function restoreStockForOrder(orderId: string): Promise<void> {
  const { restoreReservedStock } = await import("@/lib/stock");
  await restoreReservedStock(orderId).catch(() => {});
}
