import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizePlan, PLAN_IDS } from "@/lib/plans";
import { SHOP_PLANS } from "@/data/catalog";
import { initiateSTKPush } from "@/lib/payments";
import { formatKES } from "@/lib/format";

/**
 * Switch a shop's plan (Free / Silver / Gold).
 * Wallet-first, then M-Pesa STK. Invoices live in settings (demo + PG safe)
 * with renewal reminders + grace; downgrades sweep over-limit listings.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { shopSlug, planId, phone, cancel } = body as { shopSlug?: unknown; planId?: unknown; phone?: unknown; cancel?: boolean };
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

  if (cancel) {
    await store.setShopPlan(slug, "free").catch(() => {});
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "plan.cancel", entity: "shop", entityId: slug }).catch(() => {});
    return NextResponse.json({ ok: true, shopSlug: slug, planId: "free", cancelled: true });
  }

  if (plan === "free") {
    await store.setShopPlan(slug, plan);
    // Downgrade sweep: hide newest over-limit actives beyond the free cap (5).
    try {
      const { countLiveListings } = await import("@/lib/plans");
      const live = await countLiveListings(shop.ownerId || user.id).catch(() => 0);
      if (live > 5) {
        const mine = await store.listListingsByOwner(shop.ownerId || user.id).catch(() => []);
        const actives = mine.filter((l) => l.status === "active").sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        for (const l of actives.slice(0, live - 5)) await store.setListingStatus(l.id, "hidden").catch(() => {});
      }
    } catch {}
    return NextResponse.json({ ok: true, shopSlug: slug, planId: plan, plans: PLAN_IDS });
  }
  // Wallet-first (Balance-style): instant activation when covered.
  const { getBalance, debitWallet } = await import("@/lib/wallet");
  const bal = await getBalance(user.id).catch(() => 0);
  const invoice = { id: `INV-${slug.slice(0, 8)}-${Date.now().toString(36)}`, shopSlug: slug, planId: plan, amount: def.monthly, at: new Date().toISOString(), renewsAt: new Date(Date.now() + 30 * 86400_000).toISOString(), method: "wallet" as string };
  if (bal >= def.monthly && def.monthly > 0) {
    const spent = await debitWallet(user.id, def.monthly, "plan", `${def.name} ${slug}`);
    if (spent.ok) {
      await store.setShopPlan(slug, plan);
      const inv = ((await store.getSetting("invoices").catch(() => null)) as typeof invoice[] | null) ?? [];
      await store.setSetting("invoices", [{ ...invoice, method: "wallet" }, ...inv].slice(0, 500)).catch(() => {});
      return NextResponse.json({ ok: true, shopSlug: slug, planId: plan, invoice, payment: { status: "paid", message: `Paid from wallet (${spent.balance} KES left).` } });
    }
  }
  // Paid plan: M-Pesa STK push for the monthly fee.
  const fresh = await store.findUserById(user.id).catch(() => null);
  const payPhone = String(phone ?? fresh?.phone ?? user.phone ?? "").trim();
  if (!/^(\+254|0)[17]\d{8}$/.test(payPhone)) {
    return NextResponse.json({ error: "Enter a valid M-Pesa phone (07…) to pay for the plan." }, { status: 400 });
  }
  const payment = await initiateSTKPush({
    orderId: `plan-${slug}-${plan}`,
    amount: def.monthly,
    phone: payPhone,
    method: "mpesa",
    label: `${def.name} plan`,
  });
  if (payment.status === "processing" && payment.providerRef) {
    await store.setSetting(`mpesa_link:${payment.providerRef}`, { planShop: slug, planId: plan }).catch(() => {});
    const inv = ((await store.getSetting("invoices").catch(() => null)) as typeof invoice[] | null) ?? [];
    await store.setSetting("invoices", [{ ...invoice, method: "mpesa", providerRef: payment.providerRef }, ...inv].slice(0, 500)).catch(() => {});
  }
  // Demo mode (no Daraja): activate immediately so flows stay testable.
  const { isPaymentsLive } = await import("@/lib/payments");
  if (!isPaymentsLive()) {
    await store.setShopPlan(slug, plan);
  }
  return NextResponse.json({
    ok: true,
    shopSlug: slug,
    planId: plan,
    plans: PLAN_IDS,
    payment: { status: payment.status, message: payment.message, providerRef: payment.providerRef },
    summary: `${def.name} plan for ${formatKES(def.monthly)}/mo. ${payment.message}`,
    invoice,
    ...(isPaymentsLive() ? {} : { note: "Demo billing — plan active immediately; connect Daraja for live billing." }),
  });
}

/** Current persisted plan for the seller's shop(s). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const owned = await getStore().listShopsByOwner(user.id).catch(() => []);
  return NextResponse.json({
    shops: owned.map((s) => ({ slug: s.slug, name: s.name, planId: normalizePlan((s as { planId?: unknown }).planId) })),
  });
}
