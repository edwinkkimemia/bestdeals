import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isPhoneVerified } from "@/lib/otp";
import { logAudit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";

/** Single order — visible to the checkout phone owner (OTP) or the signed-in buyer/seller/admin. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(clientKey(req, "order:get"), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const order = await getStore().getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const user = await currentUser().catch(() => null);
  const phoneOk = phone && order.phone === phone && (await isPhoneVerified(phone).catch(() => false));
  const legacyPhone = phone && order.phone === phone;
  const ok =
    phoneOk ||
    legacyPhone ||
    (user && (order.buyerId === user.id || user.role === "ADMIN"));
  if (!ok) return NextResponse.json({ error: "Not your order." }, { status: 403 });
  return NextResponse.json({ order });
}

const BUYER_CANCEL_FROM = new Set(["pending", "confirmed"]);
const SELLER_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Order state machine: buyer cancel, seller fulfil, admin override. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const next = String(body.status || "").toLowerCase();
  if (!next) return NextResponse.json({ error: "Provide status." }, { status: 400 });
  const store = getStore();
  const order = await store.getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const isBuyer = order.buyerId === user.id;
  const isAdmin = user.role === "ADMIN";
  // Seller = owns a shop or listing behind any suborder seller name.
  let isSeller = false;
  if (!isBuyer && !isAdmin) {
    const users = await store.listUsers().catch(() => []);
    void users;
    // Match by display name against suborder seller labels (store listings snapshot sellerName).
    const mine = await store.listListingsByOwner(user.id).catch(() => []);
    const myNames = new Set(mine.map((l) => l.sellerName));
    myNames.add(user.name);
    isSeller = order.suborders.some((s) => myNames.has(s.seller));
  }
  if (isAdmin) {
    await store.setOrderStatus(order.id, next).catch(() => {});
    await logAudit({ actorId: user.id, actorEmail: user.email, action: `order.${next}`, entity: "order", entityId: order.id }).catch(() => {});
    return NextResponse.json({ ok: true, status: next });
  }
  if (isBuyer) {
    if (next !== "cancelled" || !BUYER_CANCEL_FROM.has(order.status)) {
      return NextResponse.json({ error: `Buyers can only cancel pending/confirmed orders.` }, { status: 409 });
    }
    await store.setOrderStatus(order.id, "cancelled").catch(() => {});
    await store.setOrderPayment(order.id, "cancelled").catch(() => {});
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  if (isSeller) {
    const allowed = SELLER_FLOW[order.status] ?? [];
    if (!allowed.includes(next)) return NextResponse.json({ error: `Can't move ${order.status} → ${next}.` }, { status: 409 });
    await store.setOrderStatus(order.id, next).catch(() => {});
    notifyLater({ channel: "sms", to: order.phone, message: `Chap: order ${order.id} is now ${next}.` });
    return NextResponse.json({ ok: true, status: next });
  }
  return NextResponse.json({ error: "Not your order." }, { status: 403 });
}
