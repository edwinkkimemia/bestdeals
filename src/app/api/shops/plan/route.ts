import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizePlan, PLAN_IDS } from "@/lib/plans";
import { SHOP_PLANS } from "@/data/catalog";

/**
 * Persist a shop's plan (Free / Silver / Gold).
 * Demo billing: the plan activates immediately with no charge — M-Pesa
 * recurring billing for plans is not yet wired (boosts already use STK push).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { shopSlug, planId } = body as { shopSlug?: unknown; planId?: unknown };
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
  return NextResponse.json({
    ok: true,
    shopSlug: slug,
    planId: plan,
    plans: PLAN_IDS,
    note: "Plan active immediately.",
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
