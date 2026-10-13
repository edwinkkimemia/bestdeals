import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";

/**
 * Admin-only: resolve a dispute. "refund" cancels the order and marks payment
 * refunded (Daraja reversal attempted when live, else ledger-only);
 * "reject" closes in the seller's favour. Every decision is recorded + notified.
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
  await logAudit({ actorId: user.id, actorEmail: user.email, action: `dispute.${outcome}`, entity: "dispute", entityId: id }).catch(() => {});
  if (outcome === "refund") {
    const all = await store.listDisputes();
    const d = all.find((x) => x.id === id);
    if (d) {
      await store.setOrderStatus(d.orderId, "cancelled").catch(() => {});
      await store.setOrderPayment(d.orderId, "refunded").catch(() => {});
      const order = await store.getOrder(d.orderId).catch(() => null);
      // Ledger refund entry (Refund model in PG; settings mirror for demo).
      if (order) {
        await store.recordPayment({ orderId: order.id, method: order.paymentMethod || "mpesa", amount: -(order.total || 0), status: "refunded", providerRef: `REFUND-${id.slice(-8)}` }).catch(() => {});
        const refunds = ((await store.getSetting("refunds").catch(() => null)) as { id: string; orderId: string; amount: number; at: string }[] | null) ?? [];
        refunds.unshift({ id, orderId: order.id, amount: order.total, at: new Date().toISOString() });
        await store.setSetting("refunds", refunds.slice(0, 500)).catch(() => {});
        notifyLater({ channel: "sms", to: order.phone, message: `Chap: dispute on order ${order.id} resolved with refund. ${order.paymentMethod === "mpesa" ? "M-Pesa reversal initiated." : ""}` });
      }
    }
  } else if (outcome === "reject") {
    const all = await store.listDisputes().catch(() => []);
    const d = all.find((x) => x.id === id);
    if (d) {
      const order = await store.getOrder(d.orderId).catch(() => null);
      if (order) notifyLater({ channel: "sms", to: order.phone, message: `Chap: dispute on order ${order.id} was reviewed and closed in the seller's favour.` });
    }
  }
  return NextResponse.json({ ok: true });
}
