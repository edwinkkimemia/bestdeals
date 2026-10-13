/**
 * KYC decision helper: approving a verification marks the user verified.
 * Approvals verify the user's shops too (business + individual) so the
 * shop-KYC loop closes without a separate shop button; phone changes
 * re-queue verification via /api/profile.
 */
import type { Store } from "./store";

export async function applyVerificationApproval(store: Store, verificationId: string, adminId: string) {
  await store.decideVerification(verificationId, true, adminId);
  const all = await store.listVerifications().catch(() => []);
  const v = all.find((x) => x.id === verificationId) ?? null;
  if (!v) return null;
  await store.setUserVerified(v.userId, true);
  const shops = await store.listShopsByOwner(v.userId).catch(() => []);
  for (const s of shops) {
    await store.setShopVerified(s.slug, true).catch(() => null);
  }
  return v;
}
