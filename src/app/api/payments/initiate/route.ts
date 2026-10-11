import { NextRequest, NextResponse } from "next/server";
import { initiateSTKPush, validateMpesaCallback } from "@/lib/payments";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

/** Step 1: initiate provider payment for a reserved order. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "pay:init"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many payment attempts." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { orderId, method, phone } = body as { orderId?: string; method?: string; phone?: string };
  if (!orderId || !phone) return NextResponse.json({ error: "Order and phone are required." }, { status: 400 });
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
  const result = await initiateSTKPush({ orderId, amount: order.total, phone, method: "mpesa" });
  if (result.status === "processing") {
    await getStore().setOrderPayment(orderId, "processing").catch(() => {});
  }
  return NextResponse.json({ ok: result.ok, status: result.status, message: result.message, providerRef: result.providerRef });
}

/** Step 2: Daraja callback — validates authenticity + amount, idempotent. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateMpesaCallback(body);
  if (!v.valid) return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  if (v.resultCode !== 0) {
    return NextResponse.json({ ok: true, status: "failed", message: "Payment failed or cancelled by user." });
  }
  // Idempotent ledger write: repeated callbacks with the same receipt are deduped.
  const store = getStore();
  if (v.providerRef) {
    const { duplicate } = await store.recordPayment({
      orderId: v.orderRef || "unknown",
      method: "mpesa",
      amount: v.amount ?? 0,
      status: "paid",
      providerRef: v.providerRef,
    });
    if (duplicate) return NextResponse.json({ ok: true, status: "paid", providerRef: v.providerRef, duplicate: true });
  }
  return NextResponse.json({ ok: true, status: "paid", providerRef: v.providerRef });
}
