import { NextResponse } from "next/server";
import { currentUser, type SessionUser } from "./auth";
import { getStore } from "./store";

export type VerifiedSeller = SessionUser & { phone: string; name: string };

type GateOk = { ok: true; seller: VerifiedSeller };
type GateNo = { ok: false; response: NextResponse };

/**
 * Posting gate: only admin-verified sellers (national ID + email + phone
 * reviewed at /dashboard/verify) may list items or open shops.
 * Reads the FRESH verified flag from the store — never the sign-in token.
 */
export async function requireVerifiedSeller(): Promise<GateOk | GateNo> {
  const denied = (error: string, status: number, code?: string) => ({
    ok: false as const,
    response: NextResponse.json({ error, ...(code ? { code } : {}) }, { status }),
  });
  const user = await currentUser();
  if (!user) return denied("Sign in to list an item.", 401);
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  const verified = fresh?.verified ?? user.verified;
  if (!verified) {
    return denied(
      "Verify your account before posting: submit your national ID and confirm your number at /dashboard/verify. Admin approval unlocks listing.",
      403,
      "NOT_VERIFIED"
    );
  }
  return {
    ok: true,
    seller: { ...user, name: fresh?.name ?? user.name, phone: fresh?.phone ?? user.phone, verified: true },
  };
}
