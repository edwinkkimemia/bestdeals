import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizePlan, planChangeKind, pendingPlanKey, PLAN_IDS, PLAN_LISTING_LIMITS, type PendingPlan } from "@/lib/plans";
import { SHOP_PLANS } from "@/data/catalog";
import { initiateSTKPush } from "@/lib/payments";
import { formatKES } from "@/lib/format";

export type PlanInvoice = {
  id: string;
  shopSlug: string;
  planId: string;
  amount: number;
  at: string;
  renewsAt: string;
  method: string;
  status: "paid" | "pending";
  providerRef?: string;
};

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

/** Activate a paid plan: set plan, clear pending, mark invoice paid. */
async function activatePaidPlan(shopSlug: string, planId: string, invoiceId: string, providerRef?: string): Promise<void> {
  const store = getStore();
  await store.setShopPlan(shopSlug, planId);
  await store.setSetting(pendingPlanKey(shopSlug), null).catch(() => {});
  await markInvoice(invoiceId, "paid", providerRef);
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
 * Switch a shop's plan (Free / Silver / Gold).
 * Downgrades apply immediately (nothing owed). Upgrades create a pending
 * checkout — wallet balance activates instantly, otherwise M-Pesa STK;
 * the plan flips only when payment confirms (wallet, M-Pesa callback, or
 * admin confirm). Switching without paying is not possible.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { shopSlug, planId, phone, cancel, confirm, clearPending } = body as {
    shopSlug?: unknown;
    planId?: unknown;
    phone?: unknown;
    cancel?: boolean;
    confirm?: boolean;
    clearPending?: boolean;
  };
  const plan = normalizePlan(planId);
  const def = SHOP_PLANS.find((p) => p.id === plan);
  if (!def) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  const store = getStore();
  let slug = String(shopSlug ?? "").trim();
  if (!slug) {
    const owned = await store.listShopsByOwner(user.id).catch(() => []);
    if (owned.length === 0) {
      return NextResponse.json({ error: "Create your shop first, then choose a plan." }, { status: 400 });
    }
    slug = owned[0].slug;
  }
  const shop = await store.getShopBySlug(slug).catch(() => null);
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  const members = await store.listShopMembers(slug).catch(() => []);
  const isOwner =
    user.role === "ADMIN" ||
    shop.ownerId === user.id ||
    members.some((m) => m.userId === user.id && m.role === "owner");
  if (!isOwner) return NextResponse.json({ error: "Only the shop owner can change the plan." }, { status: 403 });

  const current = normalizePlan((shop as { planId?: unknown }).planId);

  // Admin payment confirmation for a pending upgrade.
  if (confirm) {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
    const pending = (await store.getSetting(pendingPlanKey(slug)).catch(() => null)) as PendingPlan | null;
    if (!pending) return NextResponse.json({ error: "No pending plan payment for this shop." }, { status: 404 });
    await activatePaidPlan(slug, pending.planId, pending.invoiceId);
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.confirm", entity: "shop", entityId: slug, reason: pending.planId }).catch(() => {});
    return NextResponse.json({ ok: true, shopSlug: slug, planId: pending.planId, confirmed: true });
  }

  // Drop just the pending upgrade (stays on the current paid plan).
  if (clearPending) {
    await store.setSetting(pendingPlanKey(slug), null).catch(() => {});
    return NextResponse.json({ ok: true, shopSlug: slug, planId: current, cleared: true });
  }

  if (cancel) {
    await store.setSetting(pendingPlanKey(slug), null).catch(() => {});
    await store.setShopPlan(slug, "free").catch(() => {});
    await sweepOverLimit(shop.ownerId || user.id, PLAN_LISTING_LIMITS.free).catch(() => {});
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.cancel", entity: "shop", entityId: slug }).catch(() => {});
    return NextResponse.json({ ok: true, shopSlug: slug, planId: "free", cancelled: true });
  }

  const kind = planChangeKind(current, plan);
  if (kind === "same") {
    await store.setSetting(pendingPlanKey(slug), null).catch(() => {});
    return NextResponse.json({ ok: true, shopSlug: slug, planId: plan, unchanged: true, plans: PLAN_IDS });
  }
  if (kind === "downgrade") {
    await store.setSetting(pendingPlanKey(slug), null).catch(() => {});
    await store.setShopPlan(slug, plan);
    const hidden = await sweepOverLimit(shop.ownerId || user.id, PLAN_LISTING_LIMITS[plan]).catch(() => 0);
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.downgrade", entity: "shop", entityId: slug, reason: `${current}->${plan}` }).catch(() => {});
    return NextResponse.json({
      ok: true,
      shopSlug: slug,
      planId: plan,
      downgraded: true,
      plans: PLAN_IDS,
      summary: `Downgraded to ${def.name} ✓${hidden > 0 ? ` ${hidden} newest listing(s) hidden to fit the ${plan} limit.` : ""}`,
    });
  }

  // Upgrade — payment first. Wallet balance activates instantly.
  const { getBalance, debitWallet } = await import("@/lib/wallet");
  const bal = await getBalance(user.id).catch(() => 0);
  const invoice: PlanInvoice = {
    id: `INV-${slug.slice(0, 8)}-${Date.now().toString(36)}`,
    shopSlug: slug,
    planId: plan,
    amount: def.monthly,
    at: new Date().toISOString(),
    renewsAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
    method: "wallet",
    status: "paid",
  };
  if (bal >= def.monthly && def.monthly > 0) {
    const spent = await debitWallet(user.id, def.monthly, "plan", `${def.name} ${slug}`);
    if (spent.ok) {
      await store.setSetting(pendingPlanKey(slug), null).catch(() => {});
      await store.setShopPlan(slug, plan);
      await writeInvoices([{ ...invoice, method: "wallet" }, ...(await readInvoices())]);
      return NextResponse.json({
        ok: true,
        shopSlug: slug,
        planId: plan,
        invoice,
        payment: { status: "paid", message: `Paid from wallet (${spent.balance} KES left).` },
        summary: `${def.name} plan active ✓ — ${formatKES(def.monthly)}/mo paid from wallet.`,
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
  const existing = (await store.getSetting(pendingPlanKey(slug)).catch(() => null)) as PendingPlan | null;
  let invoiceId = existing && existing.planId === plan ? existing.invoiceId : invoice.id;
  if (!existing || existing.planId !== plan) {
    await writeInvoices([{ ...invoice, method: "mpesa", status: "pending" }, ...(await readInvoices())]);
  }
  const payment = await initiateSTKPush({
    orderId: `plan-${slug}-${plan}`,
    amount: def.monthly,
    phone: payPhone,
    method: "mpesa",
    label: `${def.name} plan`,
  });
  const pending: PendingPlan = {
    planId: plan,
    amount: def.monthly,
    phone: payPhone,
    invoiceId,
    at: new Date().toISOString(),
    ...(payment.providerRef ? { providerRef: payment.providerRef } : {}),
  };
  await store.setSetting(pendingPlanKey(slug), pending).catch(() => {});
  if (payment.status === "processing" && payment.providerRef) {
    await store.setSetting(`mpesa_link:${payment.providerRef}`, { planShop: slug, planId: plan }).catch(() => {});
    await markInvoice(invoiceId, "pending", payment.providerRef);
  }
  return NextResponse.json({
    ok: true,
    shopSlug: slug,
    planId: current,
    pendingPlan: plan,
    pending: true,
    plans: PLAN_IDS,
    payment: { status: payment.status, message: payment.message, providerRef: payment.providerRef },
    summary: `${def.name} plan (${formatKES(def.monthly)}/mo) reserved — still on ${current} until payment confirms. ${payment.message}`,
    invoice: { ...invoice, method: "mpesa", status: "pending" as const },
  });
}

/** Current persisted plan + pending checkout for the seller's shop(s). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const owned = await getStore().listShopsByOwner(user.id).catch(() => []);
  const pending: Record<string, PendingPlan | null> = {};
  for (const s of owned) {
    pending[s.slug] = (await getStore().getSetting(pendingPlanKey(s.slug)).catch(() => null)) as PendingPlan | null;
  }
  return NextResponse.json({
    shops: owned.map((s) => ({ slug: s.slug, name: s.name, planId: normalizePlan((s as { planId?: unknown }).planId) })),
    pending,
  });
}
