import { NextRequest, NextResponse } from "next/server";
import { initiateSTKPush, validateMpesaCallback, resolveMpesaOrderId } from "@/lib/payments";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";

/** Step 1: initiate provider payment for a reserved order. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "pay:init"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many payment attempts." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { orderId, method, phone, promoId, planShop, planId } = body as { orderId?: string; method?: string; phone?: string; promoId?: string; planShop?: string; planId?: string };
  if (!orderId || !phone) return NextResponse.json({ error: "Order and phone are required." }, { status: 400 });
  if (!/^(\+254|0)[17]\d{8}$/.test(phone)) return NextResponse.json({ error: "Use a valid Kenyan phone e.g. 0712345678." }, { status: 400 });
  if (method === "card") {
    return NextResponse.json({ ok: false, status: "pending", message: "Card payments are not available yet — please choose M-Pesa or cash on delivery." });
  }
  if (method === "cod") {
    return NextResponse.json({ ok: true, status: "pending_cod", message: "Cash on delivery selected. Pay the courier on arrival." });
  }
  // Amount always comes from the server-side order — never the browser.
  const order = await getStore().getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ ok: true, status: "paid", message: "Order already paid." });
  }
  const result = await initiateSTKPush({ orderId, amount: order.total, phone, method: "mpesa", label: promoId ? "boost" : planId ? "plan" : "order" });
  if (result.status === "processing" && result.providerRef) {
    await getStore().setOrderPayment(orderId, "processing").catch(() => {});
    // Link promo/plan activation to the Daraja request id for the callback.
    if (promoId || (planShop && planId)) {
      await getStore().setSetting(`mpesa_link:${result.providerRef}`, { promoId, planShop, planId }).catch(() => {});
    }
  }
  return NextResponse.json({ ok: result.ok, status: result.status, message: result.message, providerRef: result.providerRef });
}

/** Step 2: Daraja callback (alternate URL) — same logic as /mpesa-callback. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateMpesaCallback(body);
  if (!v.valid) return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  if (v.resultCode !== 0) {
    if (v.orderRef) {
      const mapped: { orderId?: string; amount?: number } = await resolveMpesaOrderId(v.orderRef).catch(() => ({}));
      if (mapped.orderId) {
        await getStore().setOrderPayment(mapped.orderId, "failed").catch(() => {});
        await logAudit({ action: "payment.failed", entity: "order", entityId: mapped.orderId, reason: `result=${v.resultCode}` }).catch(() => {});
      }
    }
    return NextResponse.json({ ok: true, status: "failed", message: "Payment failed or cancelled by user." });
  }
  // Idempotent ledger write: repeated callbacks with the same receipt are deduped.
  const store = getStore();
  const mapped2: { orderId?: string; amount?: number } = v.orderRef ? await resolveMpesaOrderId(v.orderRef).catch(() => ({})) : {};
  const orderId = mapped2.orderId || v.orderRef || "unknown";
  if (v.providerRef) {
    const { duplicate } = await store.recordPayment({
      orderId,
      method: "mpesa",
      amount: v.amount ?? mapped2.amount ?? 0,
      status: "paid",
      providerRef: v.providerRef,
    });
    if (duplicate) return NextResponse.json({ ok: true, status: "paid", providerRef: v.providerRef, duplicate: true });
    if (orderId !== "unknown") {
      const order = await store.getOrder(orderId);
      if (order && (v.amount === undefined || v.amount === (mapped2.amount ?? order.total)) && order.paymentStatus !== "paid") {
        await store.setOrderPayment(order.id, "paid", v.providerRef).catch(() => {});
        await store.setOrderStatus(order.id, "confirmed").catch(() => {});
      }
    }
  }
  return NextResponse.json({ ok: true, status: "paid", providerRef: v.providerRef });
}
