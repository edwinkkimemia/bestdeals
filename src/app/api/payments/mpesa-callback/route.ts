import { NextRequest, NextResponse } from "next/server";
import { validateMpesaCallback } from "@/lib/payments";
import { getStore } from "@/lib/store";

/**
 * Public Daraja callback URL: POST /api/payments/mpesa-callback
 * Verifies amount against the server-side order total, writes the ledger
 * idempotently (unique providerRef), then transitions pending → paid.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const v = validateMpesaCallback(body);
  if (!v.valid) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
  if (v.resultCode !== 0 || !v.providerRef) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Recorded as failed" });
  }
  const store = getStore();
  const { duplicate } = await store.recordPayment({
    orderId: v.orderRef || "unknown",
    method: "mpesa",
    amount: v.amount ?? 0,
    status: "paid",
    providerRef: v.providerRef,
  });
  if (!duplicate && v.orderRef) {
    const order = await store.getOrder(v.orderRef);
    if (order && v.amount === order.total && order.paymentStatus !== "paid") {
      await store.setOrderPayment(order.id, "paid", v.providerRef);
      await store.setOrderStatus(order.id, "confirmed");
    }
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
