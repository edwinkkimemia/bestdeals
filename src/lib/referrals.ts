import { getStore, type Store } from "./store";

/** Invite link for a user — the code is the user id (opaque, looked up directly). */
export function referralLink(userId: string, base: string): string {
  return `${base.replace(/\/$/, "")}/auth/signup?ref=${encodeURIComponent(userId)}`;
}

export const REFERRAL_REWARD = {
  kind: "featured",
  days: 7,
  /** Free 7-day Featured boost applied to the referrer's latest live listing. */
  blurb: "Free 7-day Featured boost",
} as const;

/**
 * Qualify a pending referral once the invited user gets verified, and apply
 * the reward immediately: a free 7-day Featured boost on the referrer's
 * latest active listing (skipped with status `qualified` when they have none
 * live yet — the count still shows on their dashboard).
 */
export async function qualifyReferralsFor(referredUserId: string, store: Store = getStore()): Promise<{
  qualified: boolean;
  rewardPromoId?: string;
} | null> {
  const ref = await store.findReferralByReferred(referredUserId).catch(() => null);
  if (!ref || ref.status !== "pending") return null;
  const referred = await store.findUserById(referredUserId).catch(() => null);
  if (!referred || !referred.verified) return null;

  await store.setReferralStatus(ref.id, "qualified");
  const mine = await store.listListingsByOwner(ref.referrerUserId).catch(() => []);
  const target = mine.find((l) => l.status === "active");
  if (!target) return { qualified: true };
  try {
    const promo = await store.createPromotion({
      listingId: target.id,
      ownerId: ref.referrerUserId,
      kind: REFERRAL_REWARD.kind,
      days: REFERRAL_REWARD.days,
      amount: 0,
    });
    await store.activatePromotion(promo.id);
    await store.setListingFeatured(target.id, true).catch(() => null);
    await store.setReferralStatus(ref.id, "rewarded", promo.id);
    return { qualified: true, rewardPromoId: promo.id };
  } catch {
    return { qualified: true };
  }
}
