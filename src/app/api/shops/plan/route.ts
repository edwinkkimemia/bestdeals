import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizePlan, PLAN_IDS } from "@/lib/plans";
import { SHOP_PLANS } from "@/data/catalog";
import { initiateSTKPush } from "@/lib/payments";
import { formatKES } from "@/lib/format";

/**
 * Switch a shop's plan (Free / Silver / Gold).
 * Paid plans initiate an M-Pesa STK push (same pattern as ad boosts);
 * until Daraja billing is configured the plan activates immediately with
 * labelled demo billing and an admin confirms payment like boosts.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { shopSlug, planId, phone } = body as { shopSlug?: unknown; planId?: unknown; phone?: unknown };
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

  await store.setShopPlan(slug, plan);
  if (plan === "free") {
    return NextResponse.json({ ok: true, shopSlug: slug, planId: plan, plans: PLAN_IDS });
  }
  // Paid plan: M-Pesa STK push for the monthly fee (advertising-style flow).
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
  return NextResponse.json({
    ok: true,
    shopSlug: slug,
    planId: plan,
    plans: PLAN_IDS,
    payment: { status: payment.status, message: payment.message, providerRef: payment.providerRef },
    summary: `${def.name} plan for ${formatKES(def.monthly)}/mo. ${payment.message}`,
    note: "Demo billing — plan active immediately; confirm the M-Pesa prompt when sent.",
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
