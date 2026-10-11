/**
 * KYC decision helper: approving a verification marks the user verified.
 * Business-kind approvals additionally verify the user's shops, closing the
 * shop-KYC loop (the admin queue has no separate shop button).
 */
import type { Store } from "./store";

export async function applyVerificationApproval(store: Store, verificationId: string, adminId: string) {
  await store.decideVerification(verificationId, true, adminId);
  const all = await store.listVerifications().catch(() => []);
  const v = all.find((x) => x.id === verificationId) ?? null;
  if (!v) return null;
  await store.setUserVerified(v.userId, true);
  if (v.kind === "business") {
    const shops = await store.listShopsByOwner(v.userId).catch(() => []);
    for (const s of shops) {
      await store.setShopVerified(s.slug, true).catch(() => null);
    }
  }
  return v;
}
