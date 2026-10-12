import { NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validators";
import { getListing, COUPONS } from "@/data/catalog";
import { cartTotals, commissionDue } from "@/lib/format";
import { COMMISSION_BPS_DEFAULT } from "@/data/catalog";
import { uid } from "@/lib/utils";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notify";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";

/**
 * My orders. Signed-in buyers get their linked orders; guests look up by
 * exact checkout phone (rate-limited). Production hardens this with OTP.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "orders:get"), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const user = await currentUser().catch(() => null);
  const store = getStore();
  const mine = new Map<string, unknown>();
  if (user) {
    for (const o of await store.listOrdersByBuyer(user.id)) mine.set(o.id, o);
    const urec = await store.findUserById(user.id).catch(() => null);
    if (urec) for (const o of await store.listOrdersByPhone(urec.phone)) mine.set(o.id, o);
  }
  if (/^(\+254|0)[17]\d{8}$/.test(phone)) {
    for (const o of await store.listOrdersByPhone(phone)) mine.set(o.id, o);
  }
  if (mine.size === 0 && !user && !phone) {
    return NextResponse.json({ error: "Sign in or provide your checkout phone." }, { status: 401 });
  }
  return NextResponse.json({ items: [...mine.values()] });
}

const DELIVERY = { standard: 250, express: 500, pickup: 0 } as const;

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

  const lines: { id: string; qty: number; price: number; title: string; seller: string; stock: number }[] = [];
  const store = getStore();
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
    lines.push({ id: s.id, qty: it.qty, price: s.price, title: s.title, seller: s.sellerName, stock: s.stock });
  }

  const code = (d.coupon ?? "").trim().toUpperCase();
  const stored = code ? await store.getCoupon(code).catch(() => null) : null;
  const fallback = code ? COUPONS[code] : undefined;
  const coupon = stored && stored.active
    ? { value: stored.value, minSpend: stored.minSpend }
    : fallback
      ? { value: fallback.value, minSpend: fallback.minSpend }
      : undefined;
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const couponValue = coupon && subtotal >= coupon.minSpend ? Math.min(coupon.value, subtotal) : 0;
  const totals = cartTotals(lines.map((l) => ({ unitPrice: l.price, qty: l.qty })), {
    couponValue,
    deliveryFee: DELIVERY[d.deliveryMethod],
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
  const order = await store.createOrder({
    id: orderId,
    buyerId: buyer?.id,
    total: totals.total,
    subtotal: totals.subtotal,
    discount: totals.discount,
    delivery: totals.delivery,
    status: "pending",
    paymentStatus: "pending_cod",
    paymentMethod: "cod",
    phone: d.phone,
    name: d.name,
    email: d.email || undefined,
    county: d.county,
    town: d.town,
    address: d.address,
    deliveryMethod: d.deliveryMethod,
    items: lines.map((l) => ({ id: l.id, title: l.title, qty: l.qty, price: l.price })),
    suborders,
  });
  await store.recordPayment({ orderId, method: d.paymentMethod, amount: totals.total, status: "pending" }).catch(() => {});

  await sendNotification({ channel: "sms", to: d.phone, message: `Chap: order ${orderId} received (${totals.total} KES). Pay cash on delivery — never send money in advance.` }).catch(() => {});

  return NextResponse.json({ ok: true, orderId, total: totals.total, suborders: suborders.length, order });
}
