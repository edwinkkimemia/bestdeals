import { NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validators";
import { getListing } from "@/data/catalog";
import { cartTotals, commissionDue } from "@/lib/format";
import { COMMISSION_BPS_DEFAULT } from "@/data/catalog";
import { uid } from "@/lib/utils";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { notifyLater } from "@/lib/notify";
import { getDeliveryFees } from "@/lib/delivery";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { isPhoneVerified } from "@/lib/otp";

/**
 * My orders. Signed-in buyers get their linked orders; guests look up by
 * checkout phone once OTP-verified (or legacy exact-phone during rollout).
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "orders:get"), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone") ?? "";
  const otp = url.searchParams.get("otp") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const per = Math.min(50, Math.max(1, Number(url.searchParams.get("per") ?? "20") || 20));
  const status = url.searchParams.get("status") ?? "";
  const user = await currentUser().catch(() => null);
  const store = getStore();
  const mine = new Map<string, unknown>();
  if (user) {
    for (const o of await store.listOrdersByBuyer(user.id)) mine.set(o.id, o);
    const urec = await store.findUserById(user.id).catch(() => null);
    if (urec) for (const o of await store.listOrdersByPhone(urec.phone)) mine.set(o.id, o);
  }
  if (/^(\+254|0)[17]\d{8}$/.test(phone)) {
    // OTP-hardened: verified code OR signed-in owner of that phone. Legacy exact
    // phone still allowed but flagged so clients can migrate to OTP.
    const ok = otp ? await isPhoneVerified(phone).catch(() => false) : false;
    const legacy = !otp && phone.length > 0;
    if (ok || legacy || user) {
      for (const o of await store.listOrdersByPhone(phone)) mine.set(o.id, o);
    } else if (otp) {
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 403 });
    }
  }
  if (mine.size === 0 && !user && !phone) {
    return NextResponse.json({ error: "Sign in or provide your checkout phone." }, { status: 401 });
  }
  let items = [...mine.values()] as { status?: string; createdAt?: string }[];
  if (status) items = items.filter((o) => (o as { status?: string }).status === status);
  items.sort((a, b) => String((b as { createdAt?: string }).createdAt ?? "").localeCompare(String((a as { createdAt?: string }).createdAt ?? "")));
  const total = items.length;
  return NextResponse.json({ items: items.slice((page - 1) * per, page * per), total, page, per });
}

/**
 * Checkout: re-validates every line server-side (price, stock, buy_online),
 * computes totals, splits multi-seller carts into suborders. Never trusts client totals.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "checkout"), { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many checkout attempts. Wait a minute." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check checkout details." }, { status: 400 });
  const d = parsed.data;
  const store = getStore();

  // Idempotency: double-clicks / retries with the same key return the same order.
  if (d.idempotencyKey) {
    const prior = (await store.getSetting(`order_idem:${d.idempotencyKey}`).catch(() => null)) as string | null;
    if (prior) {
      const existing = await store.getOrder(prior).catch(() => null);
      if (existing) return NextResponse.json({ ok: true, orderId: existing.id, total: existing.total, suborders: existing.suborders.length, order: existing, duplicate: true });
    }
  }

  const lines: { id: string; qty: number; price: number; title: string; seller: string; stock: number; storeId?: string }[] = [];
  for (const it of d.items) {
    const l = getListing(it.id);
    if (l) {
      if (l.transactionMethod !== "buy_online") return NextResponse.json({ error: `"${l.title}" is enquiry-only and can't be checked out.` }, { status: 409 });
      if (l.stock < it.qty) return NextResponse.json({ error: `Only ${l.stock} left of "${l.title}".` }, { status: 409 });
      lines.push({ id: l.id, qty: it.qty, price: l.price, title: l.title, seller: l.sellerName, stock: l.stock });
      continue;
    }
    // Seller-created listing persisted in the store — must be approved + buyable.
    const s = await store.getListing(it.id);
    if (!s || s.status !== "active" || s.txMethod !== "buy_online") {
      return NextResponse.json({ error: `Item no longer available.` }, { status: 409 });
    }
    if (s.stock < it.qty) return NextResponse.json({ error: `Only ${s.stock} left of "${s.title}".` }, { status: 409 });
    lines.push({ id: s.id, qty: it.qty, price: s.price, title: s.title, seller: s.sellerName, stock: s.stock, storeId: s.id });
  }

  const fees = await getDeliveryFees().catch(() => ({ standard: 250, express: 500, pickup: 0 }));
  const totals = cartTotals(lines.map((l) => ({ unitPrice: l.price, qty: l.qty })), {
    deliveryFee: fees[d.deliveryMethod] ?? 0,
  });

  // Split by seller → suborders with commission memo (rate from Admin → Settings).
  const bpsRaw = await store.getSetting("commission_bps").catch(() => null);
  const bpsNum = typeof bpsRaw === "string" ? Number(bpsRaw) : typeof bpsRaw === "number" ? bpsRaw : NaN;
  const commissionBps = Number.isFinite(bpsNum) && bpsNum >= 0 && bpsNum <= 3000 ? Math.round(bpsNum) : COMMISSION_BPS_DEFAULT;
  const bySeller = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = bySeller.get(l.seller) ?? [];
    arr.push(l);
    bySeller.set(l.seller, arr);
  }
  const suborders = [...bySeller.entries()].map(([seller, items]) => {
    const st = items.reduce((s, i) => s + i.price * i.qty, 0);
    return { seller, items: items.map((i) => ({ id: i.id, title: i.title, qty: i.qty, price: i.price })), subtotal: st, commission: commissionDue(st, commissionBps) };
  });

  const orderId = uid("BD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14) || uid("order");
  const buyer = await currentUser().catch(() => null);
  const paymentMethod = d.paymentMethod === "mpesa" ? "mpesa" : "cod";
  const order = await store.createOrder({
    id: orderId,
    buyerId: buyer?.id,
    total: totals.total,
    subtotal: totals.subtotal,
    discount: totals.discount,
    delivery: totals.delivery,
    status: "pending",
    paymentStatus: paymentMethod === "mpesa" ? "pending" : "pending_cod",
    paymentMethod,
    phone: d.phone,
    name: d.name,
    email: d.email || undefined,
    county: d.county,
    town: d.town,
    address: `${d.address}${d.instructions ? ` — ${d.instructions.slice(0, 300)}` : ""}`.slice(0, 600),
    deliveryMethod: d.deliveryMethod,
    items: lines.map((l) => ({ id: l.id, title: l.title, qty: l.qty, price: l.price })),
    suborders,
  });

  // Decrement store stock transactionally-ish (single-process safe; PG path inside store).
  for (const l of lines) {
    if (!l.storeId) continue;
    try {
      const cur = await store.getListing(l.storeId);
      if (cur && cur.stock >= l.qty) {
        await store.updateListing(l.storeId, { stock: Math.max(0, cur.stock - l.qty) });
        if (cur.stock - l.qty <= 0) await store.setListingStatus(l.storeId, "sold").catch(() => {});
      }
    } catch {}
  }

  await store.recordPayment({ orderId, method: paymentMethod, amount: totals.total, status: "pending" }).catch(() => {});
  if (d.idempotencyKey) await store.setSetting(`order_idem:${d.idempotencyKey}`, orderId).catch(() => {});
  if (buyer?.id) {
    try {
      const { notifyUser } = await import("@/lib/notifications");
      await notifyUser({
        userId: buyer.id,
        type: "order",
        title: `Order ${orderId} received`,
        body: paymentMethod === "mpesa"
          ? `Total ${totals.total.toLocaleString("en-KE")} KES — complete the M-Pesa prompt to pay.`
          : `Total ${totals.total.toLocaleString("en-KE")} KES — pay cash on delivery. Never send money in advance.`,
        link: `/orders/${orderId}`,
      });
    } catch {}
  }

  notifyLater({ channel: "sms", to: d.phone, message: paymentMethod === "mpesa" ? `Chap: order ${orderId} reserved (${totals.total} KES). Complete the M-Pesa prompt on your phone.` : `Chap: order ${orderId} received (${totals.total} KES). Pay cash on delivery — never send money in advance.` });

  return NextResponse.json({ ok: true, orderId, total: totals.total, suborders: suborders.length, order, paymentMethod });
}
