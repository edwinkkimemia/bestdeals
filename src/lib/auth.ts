import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "bd_session";
const ALG = "HS256";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "dev-only-secret-change-me-32chars!!";
  if (process.env.NODE_ENV === "production" && (s.includes("change-me") || s.includes("dev-only") || s.length < 32)) {
    throw new Error("AUTH_SECRET must be set to a random 32+ char value in production.");
  }
  return new TextEncoder().encode(s);
}

export function isStrongSecret(): boolean {
  const s = process.env.AUTH_SECRET || "";
  return s.length >= 32 && !s.includes("change-me") && !s.includes("dev-only");
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "BUYER" | "SELLER" | "MERCHANT" | "ADMIN";
  verified: boolean;
};

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export const SESSION_COOKIE = COOKIE;

/** Secure session cookie attributes — single place so signin/signout stay in sync. */
export function sessionCookieAttrs(maxAgeSec = 7 * 24 * 3600): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  };
}

/** Back-compat demo helpers — now backed by the shared store (demo or Postgres). */
export type StoredUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "BUYER" | "SELLER" | "MERCHANT" | "ADMIN";
  verified: boolean;
  passwordHash: string;
};
