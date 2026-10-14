import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";

/**
 * Admin-only: resolve a dispute. "refund" cancels the order, attempts a live
 * Daraja reversal for M-Pesa payments, and always writes the ledger entry;
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
        // Real M-Pesa reversal when possible; otherwise say exactly that.
        let reversalNote = "";
        if (order.paymentMethod === "mpesa" && order.paymentStatus === "paid" && (order.total || 0) > 0) {
          const receipt = await store.getOrderReceipt(order.id).catch(() => null);
          if (receipt) {
            const { requestDarajaReversal } = await import("@/lib/payments");
            const rev = await requestDarajaReversal({ receipt: receipt.receipt, amount: receipt.amount || order.total, occasion: `dispute-${id.slice(-8)}` }).catch(() => null);
            if (rev?.ok) {
              reversalNote = " M-Pesa reversal submitted — funds typically return within 24h.";
              await logAudit({ actorId: user.id, actorEmail: user.email, action: "dispute.reversal", entity: "dispute", entityId: id, reason: rev.conversationId ?? "submitted" }).catch(() => {});
            } else {
              reversalNote = " Our team will complete the M-Pesa reversal manually and confirm by SMS.";
              await logAudit({ actorId: user.id, actorEmail: user.email, action: "dispute.reversal_pending", entity: "dispute", entityId: id, reason: rev?.message ?? "unavailable" }).catch(() => {});
            }
          } else {
            reversalNote = " Our team will complete the M-Pesa reversal manually and confirm by SMS.";
          }
        }
        notifyLater({ channel: "sms", to: order.phone, message: `Chap: dispute on order ${order.id} resolved with refund.${reversalNote}` });
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
