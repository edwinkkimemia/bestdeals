import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "dev-only-secret-change-me-32chars!!";
  if (process.env.NODE_ENV === "production" && (s.includes("change-me") || s.includes("dev-only") || s.length < 32)) {
    throw new Error("AUTH_SECRET must be set to a random 32+ char value in production.");
  }
  return new TextEncoder().encode(s);
}

export type TokenPurpose = "password-reset" | "email-verify";

const EXPIRY: Record<TokenPurpose, string> = {
  "password-reset": "1h",
  "email-verify": "24h",
};

/**
 * Stateless single-purpose tokens (reset/verify). No DB table needed:
 * - password-reset embeds a fingerprint of the current password hash, so the
 *   token dies automatically once the password changes (single-use effect).
 * - email-verify embeds the user id + email.
 */
export async function createPurposeToken(opts: {
  purpose: TokenPurpose;
  userId: string;
  email: string;
  fingerprint?: string;
}): Promise<string> {
  return new SignJWT({ purpose: opts.purpose, sub: opts.userId, email: opts.email, fp: opts.fingerprint ?? null })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY[opts.purpose])
    .sign(secret());
}

export async function readPurposeToken(
  token: string,
  expected: TokenPurpose
): Promise<{ userId: string; email: string; fingerprint: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const p = payload as Record<string, unknown>;
    if (p.purpose !== expected || typeof p.sub !== "string" || typeof p.email !== "string") return null;
    return { userId: p.sub, email: p.email, fingerprint: typeof p.fp === "string" ? p.fp : null };
  } catch {
    return null;
  }
}

/** Short fingerprint of a password hash — safe to embed in a signed token. */
export function hashFingerprint(hash: string): string {
  let h = 0;
  for (let i = 0; i < hash.length; i++) h = (Math.imul(h, 31) + hash.charCodeAt(i)) | 0;
  return `fp${(h >>> 0).toString(36)}${hash.length}`;
}
