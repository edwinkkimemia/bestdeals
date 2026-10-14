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

/**
 * Classify a plan switch so billing can tell free moves (downgrade/same,
 * applied immediately) from upgrades (require payment first). Rank follows
 * price: free < silver < gold.
 */
export function planChangeKind(current: PlanId, target: PlanId): "same" | "upgrade" | "downgrade" {
  const a = PLAN_IDS.indexOf(current);
  const b = PLAN_IDS.indexOf(target);
  if (b === a) return "same";
  return b > a ? "upgrade" : "downgrade";
}

export type PendingPlan = {
  planId: PlanId;
  amount: number;
  phone: string;
  invoiceId: string;
  at: string;
  providerRef?: string;
};

export const pendingPlanKey = (shopSlug: string) => `plan_pending:${shopSlug}`;

/** Analytics history each plan may view. */
export const PLAN_ANALYTICS_DAYS: Record<PlanId, number> = {
  free: 7,
  silver: 30,
  gold: 90,
};

export type SellerPlan = { planId: PlanId; shopSlug?: string; shopName?: string; personal?: boolean };

/**
 * Resolve a seller's effective plan: best of their personal seller plan and
 * the plans of shops they own, else Free. Personal plans give individual
 * sellers (no shop) the same Silver/Gold limits and features as shops.
 */
export async function getSellerPlan(userId: string): Promise<SellerPlan> {
  try {
    const store = getStore();
    const me = await store.findUserById(userId).catch(() => null);
    const personal = normalizePlan(me?.planId);
    const shops = await store.listShopsByOwner(userId);
    let best: SellerPlan = { planId: personal, ...(personal !== "free" ? { personal: true } : {}) };
    for (const s of shops) {
      const pid = normalizePlan((s as { planId?: unknown }).planId);
      const rank = PLAN_IDS.indexOf(pid);
      if (rank > PLAN_IDS.indexOf(best.planId)) {
        best = { planId: pid, shopSlug: s.slug, shopName: s.name };
      }
    }
    // New listings still attach to the first owned shop when there is one.
    if (shops.length > 0 && !best.shopSlug) {
      best = { ...best, shopSlug: shops[0].slug, shopName: shops[0].name };
    }
    return best;
  } catch {
    return { planId: "free" };
  }
}

/** Storage key for a pending personal-plan checkout. */
export const pendingSellerPlanKey = (userId: string) => `seller_plan_pending:${userId}`;

/**
 * Plan tier a live-listing count calls for: ≤5 free, 6–30 silver, 31+ gold.
 * Matches PLAN_LISTING_LIMITS (free 5, silver 30, gold unlimited).
 */
export function expectedPlanForCount(count: number): PlanId {
  if (count > 30) return "gold";
  if (count > 5) return "silver";
  return "free";
}

export type PlanAuditRow = {
  userId: string;
  name: string;
  email: string;
  liveCount: number;
  effectivePlan: PlanId;
  expectedPlan: PlanId;
  /** True when the account holds fewer plan rights than its catalogue needs. */
  needsUpgrade: boolean;
  /** Where an upgrade lands: first owned shop, else the personal plan. */
  target: { kind: "shop"; slug: string; name: string } | { kind: "personal" };
};

/**
 * Pure plan-vs-listings audit across accounts. Assignment only ever moves
 * UP (free→silver→gold) — over-provisioned accounts are reported, never
 * auto-downgraded (downgrades hide listings and need a human decision).
 */
export function auditPlanRows(
  users: { id: string; name: string; email: string; planId?: string | null }[],
  shops: { slug: string; name: string; ownerId?: string; planId?: string }[],
  counts: { ownerId: string; count: number }[]
): PlanAuditRow[] {
  const countOf = new Map(counts.map((c) => [c.ownerId, c.count]));
  const shopsByOwner = new Map<string, { slug: string; name: string; planId?: string }[]>();
  for (const s of shops) {
    if (!s.ownerId) continue;
    const list = shopsByOwner.get(s.ownerId) ?? [];
    list.push({ slug: s.slug, name: s.name, planId: s.planId });
    shopsByOwner.set(s.ownerId, list);
  }
  return users.map((u) => {
    const liveCount = countOf.get(u.id) ?? 0;
    const expectedPlan = expectedPlanForCount(liveCount);
    let effectivePlan = normalizePlan(u.planId);
    for (const s of shopsByOwner.get(u.id) ?? []) {
      const pid = normalizePlan(s.planId);
      if (PLAN_IDS.indexOf(pid) > PLAN_IDS.indexOf(effectivePlan)) effectivePlan = pid;
    }
    const owned = shopsByOwner.get(u.id) ?? [];
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      liveCount,
      effectivePlan,
      expectedPlan,
      needsUpgrade: PLAN_IDS.indexOf(expectedPlan) > PLAN_IDS.indexOf(effectivePlan),
      target: owned.length > 0
        ? { kind: "shop" as const, slug: owned[0].slug, name: owned[0].name }
        : { kind: "personal" as const },
    };
  });
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
