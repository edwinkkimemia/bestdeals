import { NextRequest, NextResponse } from "next/server";
import { passwordResetSchema } from "@/lib/validators";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { readPurposeToken, hashFingerprint } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/auth";
import { clearLoginFailures } from "@/lib/login-guard";

/** Consume a reset token and set a new password. Token dies on use (hash fingerprint). */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:pw-reset"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  const data = await readPurposeToken(parsed.data.token, "password-reset");
  if (!data) return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
  const store = getStore();
  const user = await store.findUserById(data.userId).catch(() => null);
  if (!user || user.email.toLowerCase() !== data.email.toLowerCase()) {
    return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
  }
  if (!data.fingerprint || data.fingerprint !== hashFingerprint(user.passwordHash)) {
    return NextResponse.json({ error: "This reset link was already used or is expired. Request a new one." }, { status: 400 });
  }
  await store.setUserPassword(user.id, await hashPassword(parsed.data.password));
  clearLoginFailures(user.email);
  return NextResponse.json({ ok: true, message: "Password updated — sign in with your new password." });
}
