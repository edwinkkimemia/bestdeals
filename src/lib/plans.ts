/**
 * Shop plan rules (Free / Silver / Gold). Single source of truth for
 * listing limits, analytics ranges and Gold-only feature gates.
 * Plans are stored per shop (Shop.planId); sellers without a shop get Free.
 */
import { getStore } from "./store";

export const PLAN_IDS = ["free", "silver", "gold"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function normalizePlan(raw: unknown): PlanId {
  const v = String(raw ?? "").toLowerCase();
  return (PLAN_IDS as readonly string[]).includes(v) ? (v as PlanId) : "free";
}

/** Max live (active + pending + draft + hidden) listings. Gold is unlimited. */
export const PLAN_LISTING_LIMITS: Record<PlanId, number> = {
  free: 5,
  silver: 30,
  gold: Infinity,
};

export function planAllowsListings(plan: PlanId, liveCount: number): boolean {
  return liveCount < PLAN_LISTING_LIMITS[plan];
}

/** Analytics history each plan may view. */
export const PLAN_ANALYTICS_DAYS: Record<PlanId, number> = {
  free: 7,
  silver: 30,
  gold: 90,
};

export type SellerPlan = { planId: PlanId; shopSlug?: string; shopName?: string };

/** Resolve a seller's effective plan: best plan across shops they own, else Free. */
export async function getSellerPlan(userId: string): Promise<SellerPlan> {
  try {
    const shops = await getStore().listShopsByOwner(userId);
    let best: SellerPlan = { planId: "free" };
    for (const s of shops) {
      const pid = normalizePlan((s as { planId?: unknown }).planId);
      const rank = PLAN_IDS.indexOf(pid);
      if (rank > PLAN_IDS.indexOf(best.planId)) {
        best = { planId: pid, shopSlug: s.slug, shopName: s.name };
      }
    }
    if (!best.shopSlug && shops.length > 0) {
      best = { planId: best.planId, shopSlug: shops[0].slug, shopName: shops[0].name };
    }
    return best;
  } catch {
    return { planId: "free" };
  }
}

/** Count listings that occupy a plan slot (everything except rejected/sold/expired). */
export async function countLiveListings(ownerId: string): Promise<number> {
  const mine = await getStore().listListingsByOwner(ownerId).catch(() => []);
  return mine.filter((l) => !["rejected", "sold", "expired"].includes(l.status)).length;
}

export function limitMessage(plan: PlanId, live: number): string {
  const cap = PLAN_LISTING_LIMITS[plan];
  const capLabel = Number.isFinite(cap) ? `${cap}` : "unlimited";
  return `Your ${plan} plan allows ${capLabel} live listings (you have ${live}). Upgrade to Silver or Gold at /pricing, or mark older listings as sold.`;
}

export function goldRequiredMessage(feature: string): string {
  return `${feature} is a Gold plan feature. Upgrade your shop at /pricing to unlock it.`;
}
