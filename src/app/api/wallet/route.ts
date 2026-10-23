import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { getBalance, walletHistory, creditWallet, debitWallet } from "@/lib/wallet";
import { initiateSTKPush } from "@/lib/payments";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Wallet balance + history (Jiji-style Balance lite for plans/boosts). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ balance: await getBalance(user.id), history: await walletHistory(user.id) });
}

/** Top-up via M-Pesa STK, or spend wallet on a promo (spendPromoId). */
export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `wallet:${user.id}`), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { amount, phone, spendPromoId } = body as { amount?: number; phone?: string; spendPromoId?: string };
  if (spendPromoId) {
    const promo = await getStore().getPromotion(spendPromoId).catch(() => null);
    if (!promo || promo.ownerId !== user.id) return NextResponse.json({ error: "Promotion not found." }, { status: 404 });
    const r = await debitWallet(user.id, promo.amount, "boost", `Boost ${promo.id}`);
    if (!r.ok) return NextResponse.json({ error: `Insufficient balance (${r.balance} KES). Top up first.` }, { status: 402 });
    await getStore().activatePromotion(promo.id).catch(() => {});
    const { invoicePromoId, recordPromotionInvoice } = await import("@/lib/invoices");
    const { sendInvoiceEmailById } = await import("@/lib/invoice-email");
    const active = (await getStore().getPromotion(promo.id).catch(() => null)) ?? promo;
    await recordPromotionInvoice({
      promo: active,
      ownerId: user.id,
      ownerName: user.name,
      ownerEmail: user.email,
      method: "wallet",
      status: "paid",
    }).catch(() => null);
    await sendInvoiceEmailById(invoicePromoId(promo.id), { reason: "paid", origin: new URL(req.url).origin }).catch(() => null);
    return NextResponse.json({ ok: true, balance: r.balance });
  }
  const amt = Math.round(Number(amount) || 0);
  if (amt < 50 || amt > 500000) return NextResponse.json({ error: "Top-up between 50 and 500,000 KES." }, { status: 400 });
  if (!phone || !/^(\+254|0)[17]\d{8}$/.test(phone)) return NextResponse.json({ error: "Valid M-Pesa phone required." }, { status: 400 });
  // Reserve a wallet top-up order so the callback can credit on success.
  const topupId = `WALLET-${user.id.slice(-6)}-${Date.now().toString(36)}`;
  await getStore().setSetting(`wallet_topup:${topupId}`, { userId: user.id, amount: amt }).catch(() => {});
  const r = await initiateSTKPush({ orderId: topupId, amount: amt, phone, method: "mpesa", label: "wallet top-up" });
  if (r.status === "processing" && r.providerRef) {
    await getStore().setSetting(`mpesa_req:${r.providerRef}`, { orderId: topupId, amount: amt }).catch(() => {});
  }
  // Demo mode (no Daraja): credit instantly so flows stay testable; live mode credits on callback.
  const { isPaymentsLive } = await import("@/lib/payments");
  if (!isPaymentsLive()) {
    const bal = await creditWallet(user.id, amt, "topup-demo", topupId);
    return NextResponse.json({ ok: true, balance: bal, demo: true, message: "Demo top-up credited (no M-Pesa keys)." });
  }
  return NextResponse.json({ ok: r.ok, status: r.status, message: r.message, providerRef: r.providerRef, topupId });
}
