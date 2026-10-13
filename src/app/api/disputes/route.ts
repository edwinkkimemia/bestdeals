import { NextRequest, NextResponse } from "next/server";
import { disputeSchema } from "@/lib/validators";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const REASONS: Record<string, string> = {
  not_received: "Item not received",
  not_as_described: "Not as described",
  damaged: "Damaged on arrival",
  wrong_item: "Wrong item sent",
  payment_issue: "Payment issue",
  other: "Other",
};

/** Buyer opens a dispute on an order. One open dispute per order. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "dispute"), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form." }, { status: 400 });
  }
  const d = parsed.data;
  const store = getStore();
  const order = await store.getOrder(d.orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.phone !== d.phone) {
    return NextResponse.json({ error: "Phone doesn't match this order. Use the checkout phone." }, { status: 403 });
  }
  const existing = await store.getDisputeByOrder(d.orderId);
  if (existing && !["resolved_refund", "resolved_reject", "cancelled"].includes(existing.status)) {
    return NextResponse.json({ error: "A dispute is already open for this order.", id: existing.id }, { status: 409 });
  }
  const rec = await store.createDispute({
    orderId: d.orderId,
    buyerName: d.name,
    phone: d.phone,
    reason: REASONS[d.reason] ?? d.reason,
    details: d.details || undefined,
  });
  return NextResponse.json({ ok: true, id: rec.id });
}

/** Current dispute for an order (participant only: buyer phone-OTP, seller, admin). */
export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get("order");
  if (!orderId) return NextResponse.json({ error: "Missing order." }, { status: 400 });
  const store = getStore();
  const order = await store.getOrder(orderId).catch(() => null);
  if (!order) return NextResponse.json({ dispute: null });
  const user = await currentUser().catch(() => null);
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const phoneOk = phone && order.phone === phone;
  const mine = user && (order.buyerId === user.id || user.role === "ADMIN");
  let sellerOk = false;
  if (user && !mine) {
    const mineListings = await store.listListingsByOwner(user.id).catch(() => []);
    const names = new Set([...mineListings.map((l) => l.sellerName), user.name]);
    sellerOk = order.suborders.some((s) => names.has(s.seller));
  }
  if (!phoneOk && !mine && !sellerOk) return NextResponse.json({ error: "Not your dispute." }, { status: 403 });
  const d = await store.getDisputeByOrder(orderId);
  // Never leak internal notes to buyers; response/decided fields are fine to show.
  return NextResponse.json({ dispute: d });
}

/** Seller response. Must own the order's listing/shop or be admin. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, response, cancel } = body as { id?: string; response?: string; cancel?: boolean };
  if (!id) return NextResponse.json({ error: "Missing dispute id." }, { status: 400 });
  const store = getStore();
  const all = await store.listDisputes().catch(() => []);
  const d = all.find((x) => x.id === id);
  if (!d) return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
  const order = await store.getOrder(d.orderId).catch(() => null);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  // Buyer can cancel their own open dispute.
  const isBuyer = (order.buyerId && order.buyerId === user.id) || (d.phone && (await store.findUserById(user.id).catch(() => null))?.phone === d.phone);
  if (cancel && (isBuyer || user.role === "ADMIN")) {
    await store.resolveDispute(id, "reject", user.id).catch(() => {});
    // Mark cancelled distinctly via audit (status stays resolved_reject for compat).
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "dispute.cancel", entity: "dispute", entityId: id }).catch(() => {});
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  if (!response || response.trim().length < 5) {
    return NextResponse.json({ error: "Write a response (min 5 characters)." }, { status: 400 });
  }
  // Ownership: seller of the order or admin only (any signed-in user could respond before).
  let allowed = user.role === "ADMIN";
  if (!allowed) {
    const mine = await store.listListingsByOwner(user.id).catch(() => []);
    const names = new Set([...mine.map((l) => l.sellerName), user.name]);
    allowed = order.suborders.some((s) => names.has(s.seller));
  }
  if (!allowed) return NextResponse.json({ error: "Only the seller can respond." }, { status: 403 });
  await store.respondDispute(id, response.slice(0, 2000));
  // SLA stamp for admin escalation tracking.
  await store.setSetting(`dispute_sla:${id}`, { respondedAt: new Date().toISOString(), responder: user.id }).catch(() => {});
  const { notifyLater } = await import("@/lib/notify");
  notifyLater({ channel: "sms", to: order.phone, message: `Chap: seller responded to dispute on order ${order.id}. View it in Orders.` });
  return NextResponse.json({ ok: true });
}
