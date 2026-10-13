/**
 * Verification queue helpers: every verification row carries its uploader so
 * admins can tell WHO submitted WHICH document at a glance (name, contact,
 * account kind + age) instead of an opaque user id.
 */
import type { UserRecord, VerificationRecord } from "./store";

export type VerificationUploader = Pick<
  UserRecord,
  "id" | "name" | "businessName" | "email" | "phone" | "role" | "sellerKind" | "verified" | "emailVerified" | "createdAt"
> | null;

export type EnrichedVerification = VerificationRecord & { user: VerificationUploader };

/** Pure join: attach uploader profiles to verification rows (null = deleted account). */
export function attachVerificationUsers(
  items: VerificationRecord[],
  users: UserRecord[]
): EnrichedVerification[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  return items.map((v) => {
    const u = byId.get(v.userId);
    return {
      ...v,
      user: u
        ? {
            id: u.id,
            name: u.name,
            businessName: u.businessName,
            email: u.email,
            phone: u.phone,
            role: u.role,
            sellerKind: u.sellerKind,
            verified: u.verified,
            emailVerified: u.emailVerified,
            createdAt: u.createdAt,
          }
        : null,
    };
  });
}
