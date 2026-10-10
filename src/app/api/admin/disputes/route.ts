import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * Admin-only: resolve a dispute. "refund" cancels the order and marks payment
 * refunded (M-Pesa reversal is processed with the provider where applicable);
 * "reject" closes in the seller's favour. Every decision is recorded.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { id, outcome } = body as { id?: string; outcome?: "refund" | "reject" };
  if (!id || !["refund", "reject"].includes(outcome ?? "")) {
    return NextResponse.json({ error: "Provide id + outcome (refund|reject)." }, { status: 400 });
  }
  const store = getStore();
  await store.resolveDispute(id, outcome as "refund" | "reject", user.id);
  if (outcome === "refund") {
    const all = await store.listDisputes();
    const d = all.find((x) => x.id === id);
    if (d) {
      await store.setOrderStatus(d.orderId, "cancelled").catch(() => {});
      await store.setOrderPayment(d.orderId, "refunded").catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
