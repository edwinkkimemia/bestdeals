import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizePlan, planChangeKind, pendingSellerPlanKey, PLAN_IDS, PLAN_LISTING_LIMITS, type PendingPlan } from "@/lib/plans";
import { SHOP_PLANS } from "@/data/catalog";
import { initiateSTKPush } from "@/lib/payments";
import { formatKES } from "@/lib/format";
import type { PlanInvoice } from "@/app/api/shops/plan/route";

async function readInvoices(): Promise<PlanInvoice[]> {
  return ((await getStore().getSetting("invoices").catch(() => null)) as PlanInvoice[] | null) ?? [];
}

async function writeInvoices(items: PlanInvoice[]): Promise<void> {
  await getStore().setSetting("invoices", items.slice(0, 500)).catch(() => {});
}

async function markInvoice(invoiceId: string, status: "paid" | "pending", providerRef?: string): Promise<void> {
  const inv = await readInvoices();
  await writeInvoices(
    inv.map((i) => (i.id === invoiceId ? { ...i, status, ...(providerRef ? { providerRef } : {}) } : i))
  );
}

/** Downgrade sweep: hide oldest over-limit actives beyond the target cap. */
async function sweepOverLimit(ownerId: string, cap: number): Promise<number> {
  if (!Number.isFinite(cap)) return 0;
  const store = getStore();
  const { countLiveListings } = await import("@/lib/plans");
  const live = await countLiveListings(ownerId).catch(() => 0);
  if (live <= cap) return 0;
  const mine = await store.listListingsByOwner(ownerId).catch(() => []);
  const actives = mine.filter((l) => l.status === "active").sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  let hidden = 0;
  for (const l of actives.slice(0, live - cap)) {
    await store.setListingStatus(l.id, "hidden").catch(() => {});
    hidden += 1;
  }
  return hidden;
}

/**
 * Personal seller plan (Free / Silver / Gold) — same prices and limits as
 * shop plans, for individual sellers without a storefront. A seller with a
 * shop has exactly one plan and manages it through /api/shops/plan. Same
 * checkout rules as shops: downgrades immediate, upgrades need payment first
 * (wallet instant, M-Pesa STK pending, or admin confirm).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { planId, phone, cancel, confirm, clearPending, userId } = body as {
    planId?: unknown;
    phone?: unknown;
    cancel?: boolean;
    confirm?: boolean;
    clearPending?: boolean;
    userId?: unknown;
  };
  const plan = normalizePlan(planId);
  const def = SHOP_PLANS.find((p) => p.id === plan);
  if (!def) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  // Admins may confirm (or manage) another seller's pending checkout.
  const targetId =
    user.role === "ADMIN" && typeof userId === "string" && userId.trim() ? userId.trim() : user.id;
  const store = getStore();
  const target = await store.findUserById(targetId).catch(() => null);
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (targetId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not your account." }, { status: 403 });
  }
  const shops = await store.listShopsByOwner(targetId).catch(() => []);
  const shop = shops[0] ?? null;
  const key = pendingSellerPlanKey(targetId);
  const current = normalizePlan(target.planId);

  // Admin payment confirmation for a pending upgrade.
  if (confirm) {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
    const pending = (await store.getSetting(key).catch(() => null)) as PendingPlan | null;
    if (!pending) return NextResponse.json({ error: "No pending plan payment for this seller." }, { status: 404 });
    // If the seller opened a shop while the personal checkout was pending,
    // land the paid plan on that shop so they still have exactly one plan.
    if (shop) {
      await store.setShopPlan(shop.slug, pending.planId);
      await store.setUserPlan(targetId, "free");
    } else {
      await store.setUserPlan(targetId, pending.planId);
    }
    await store.setSetting(key, null).catch(() => {});
    await markInvoice(pending.invoiceId, "paid");
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.confirm", entity: "user", entityId: targetId, reason: pending.planId }).catch(() => {});
    return NextResponse.json({ ok: true, planId: pending.planId, confirmed: true });
  }

  if (clearPending) {
    await store.setSetting(key, null).catch(() => {});
    return NextResponse.json({ ok: true, planId: current, cleared: true });
  }

  if (shop) {
    return NextResponse.json(
      {
        error: "You have a shop, so your shop plan is your only plan. Manage it on Plan & billing.",
        code: "SHOP_PLAN",
        shopSlug: shop.slug,
      },
      { status: 409 }
    );
  }

  if (cancel) {
    await store.setSetting(key, null).catch(() => {});
    await store.setUserPlan(targetId, "free").catch(() => {});
    await sweepOverLimit(targetId, PLAN_LISTING_LIMITS.free).catch(() => {});
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.cancel", entity: "user", entityId: targetId }).catch(() => {});
    return NextResponse.json({ ok: true, planId: "free", cancelled: true });
  }

  const kind = planChangeKind(current, plan);
  if (kind === "same") {
    await store.setSetting(key, null).catch(() => {});
    return NextResponse.json({ ok: true, planId: plan, unchanged: true, plans: PLAN_IDS });
  }
  if (kind === "downgrade") {
    await store.setSetting(key, null).catch(() => {});
    await store.setUserPlan(targetId, plan);
    const hidden = await sweepOverLimit(targetId, PLAN_LISTING_LIMITS[plan]).catch(() => 0);
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.downgrade", entity: "user", entityId: targetId, reason: `${current}->${plan}` }).catch(() => {});
    return NextResponse.json({
      ok: true,
      planId: plan,
      downgraded: true,
      plans: PLAN_IDS,
      summary: `Downgraded to ${def.name} ✓${hidden > 0 ? ` ${hidden} oldest listing(s) hidden to fit the ${plan} limit.` : ""}`,
    });
  }

  // Upgrade — payment first. Wallet balance activates instantly.
  const { getBalance, debitWallet } = await import("@/lib/wallet");
  const bal = await getBalance(user.id).catch(() => 0);
  const invoice: PlanInvoice = {
    id: `INV-seller-${targetId.slice(0, 6)}-${Date.now().toString(36)}`,
    shopSlug: "",
    planId: plan,
    amount: def.monthly,
    at: new Date().toISOString(),
    renewsAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    method: "wallet",
    status: "paid",
  };
  const saveSellerInvoice = async (inv: PlanInvoice) => {
    await writeInvoices([{ ...inv, userId: targetId } as PlanInvoice, ...(await readInvoices())]);
  };
  if (bal >= def.monthly && def.monthly > 0) {
    const spent = await debitWallet(user.id, def.monthly, "plan", `${def.name} seller plan`);
    if (spent.ok) {
      await store.setSetting(key, null).catch(() => {});
      await store.setUserPlan(targetId, plan);
      await saveSellerInvoice({ ...invoice, method: "wallet" });
      return NextResponse.json({
        ok: true,
        planId: plan,
        invoice,
        payment: { status: "paid", message: `Paid from wallet (${spent.balance} KES left).` },
        summary: `${def.name} seller plan active ✓ — ${formatKES(def.monthly)}/mo paid from wallet.`,
      });
    }
  }

  // M-Pesa checkout: create (or reuse) a pending upgrade. The plan flips
  // only when the STK callback, wallet, or an admin confirms payment.
  const fresh = await store.findUserById(user.id).catch(() => null);
  const payPhone = String(phone ?? fresh?.phone ?? user.phone ?? "").trim();
  if (!/^(\+254|0)[17]\d{8}$/.test(payPhone)) {
    return NextResponse.json({ error: "Enter a valid M-Pesa phone (07…) to pay for the plan." }, { status: 400 });
  }
  const existing = (await store.getSetting(key).catch(() => null)) as PendingPlan | null;
  const invoiceId = existing && existing.planId === plan ? existing.invoiceId : invoice.id;
  if (!existing || existing.planId !== plan) {
    await saveSellerInvoice({ ...invoice, method: "mpesa", status: "pending" });
  }
  const payment = await initiateSTKPush({
    orderId: `sellerplan-${targetId.slice(0, 8)}-${plan}`,
    amount: def.monthly,
    phone: payPhone,
    method: "mpesa",
    label: `${def.name} seller plan`,
  });
  const pending: PendingPlan = {
    planId: plan,
    amount: def.monthly,
    phone: payPhone,
    invoiceId,
    at: new Date().toISOString(),
    ...(payment.providerRef ? { providerRef: payment.providerRef } : {}),
  };
  await store.setSetting(key, pending).catch(() => {});
  if (payment.status === "processing" && payment.providerRef) {
    await store.setSetting(`mpesa_link:${payment.providerRef}`, { planUser: targetId, planId: plan }).catch(() => {});
    await markInvoice(invoiceId, "pending", payment.providerRef);
  }
  return NextResponse.json({
    ok: true,
    planId: current,
    pendingPlan: plan,
    pending: true,
    plans: PLAN_IDS,
    payment: { status: payment.status, message: payment.message, providerRef: payment.providerRef },
    summary: `${def.name} seller plan (${formatKES(def.monthly)}/mo) reserved — still on ${current} until payment confirms. ${payment.message}`,
    invoice: { ...invoice, method: "mpesa", status: "pending" as const },
  });
}

/** Current personal plan + pending checkout. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  const pending = (await getStore().getSetting(pendingSellerPlanKey(user.id)).catch(() => null)) as PendingPlan | null;
  return NextResponse.json({ planId: normalizePlan(fresh?.planId), pending });
}
