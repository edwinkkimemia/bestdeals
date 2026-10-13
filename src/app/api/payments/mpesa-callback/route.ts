import { NextRequest, NextResponse } from "next/server";
import { validateMpesaCallback, resolveMpesaOrderId } from "@/lib/payments";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";

/**
 * Public Daraja callback URL: POST /api/payments/mpesa-callback
 * Verifies amount against the server-side order total, writes the ledger
 * idempotently (unique providerRef), then transitions pending → paid.
 * Also activates linked promotions/plans stored alongside the request map.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateMpesaCallback(body);
  if (!v.valid) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
  if (v.resultCode !== 0 || !v.providerRef) {
    if (v.orderRef) {
      const mapped: { orderId?: string; amount?: number } = await resolveMpesaOrderId(v.orderRef).catch(() => ({}));
      if (mapped.orderId) {
        await getStore().setOrderPayment(mapped.orderId, "failed").catch(() => {});
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
  if (!duplicate && orderId !== "unknown") {
    const order = await store.getOrder(orderId);
    if (order) {
      const expected = mapped.amount ?? order.total;
      if (v.amount !== undefined && v.amount !== expected) {
        await store.setOrderPayment(order.id, "failed").catch(() => {});
        await logAudit({ action: "payment.amount_mismatch", entity: "order", entityId: order.id, reason: `got=${v.amount} want=${expected}` }).catch(() => {});
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Amount mismatch recorded" });
      }
      if (order.paymentStatus !== "paid") {
        await store.setOrderPayment(order.id, "paid", v.providerRef);
        await store.setOrderStatus(order.id, "confirmed");
      }
      // Activate any promo/plan linked to this payment (stored at initiate time).
      const promoLink = (await store.getSetting(`mpesa_link:${v.orderRef}`).catch(() => null)) as { promoId?: string; planShop?: string; planId?: string } | null;
      if (promoLink?.promoId) {
        await store.activatePromotion(promoLink.promoId).catch(() => {});
      }
      if (promoLink?.planShop && promoLink?.planId) {
        await store.setShopPlan(promoLink.planShop, promoLink.planId).catch(() => {});
        // Settle the pending plan checkout so the plan can't linger as unpaid.
        try {
          const { pendingPlanKey } = await import("@/lib/plans");
          const pending = (await store.getSetting(pendingPlanKey(promoLink.planShop)).catch(() => null)) as { invoiceId?: string } | null;
          await store.setSetting(pendingPlanKey(promoLink.planShop), null).catch(() => {});
          if (pending?.invoiceId) {
            const inv = ((await store.getSetting("invoices").catch(() => null)) as { id: string }[] | null) ?? [];
            await store
              .setSetting(
                "invoices",
                inv.map((i) => (i.id === pending.invoiceId ? { ...i, status: "paid", providerRef: v.providerRef } : i))
              )
              .catch(() => {});
          }
        } catch {}
      }
    }
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
