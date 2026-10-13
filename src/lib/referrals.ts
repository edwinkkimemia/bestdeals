import { getStore, type Store } from "./store";
import { createHash } from "crypto";

/** Invite link for a user — opaque code (not enumerable user id). */
export function referralLink(userId: string, base: string): string {
  return `${base.replace(/\/$/, "")}/auth/signup?ref=${encodeURIComponent(referralCode(userId))}`;
}

/** Opaque, stable referral code derived from user id + secret (safe to share). */
export function referralCode(userId: string): string {
  const secret = process.env.AUTH_SECRET || "dev-only-secret-change-me-32chars!!";
  return createHash("sha256").update(`${secret}:${userId}`).digest("hex").slice(0, 12);
}

/** Resolve an opaque code (or legacy raw user id) back to the referrer. */
export async function resolveReferrer(code: string, store: Store = getStore()): Promise<string | null> {
  const c = code.trim();
  if (!c) return null;
  // Legacy: raw user id still works during rollout.
  const direct = await store.findUserById(c).catch(() => null);
  if (direct) return direct.id;
  const users = await store.listUsers().catch(() => []);
  for (const u of users) {
    if (referralCode(u.id) === c) return u.id;
  }
  return null;
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
