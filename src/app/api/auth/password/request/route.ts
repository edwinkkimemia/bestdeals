import { NextRequest, NextResponse } from "next/server";
import { passwordRequestSchema } from "@/lib/validators";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createPurposeToken, hashFingerprint } from "@/lib/auth-tokens";
import { sendNotification } from "@/lib/notify";

/**
 * Request a password reset. Always returns ok (no account enumeration):
 * the email is only sent when the account exists.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:pw-request"), { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = passwordRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const user = await getStore().findUserByEmail(email).catch(() => null);
  if (user) {
    const token = await createPurposeToken({
      purpose: "password-reset",
      userId: user.id,
      email: user.email,
      fingerprint: hashFingerprint(user.passwordHash),
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const link = `${base}/auth/password/reset?token=${encodeURIComponent(token)}`;
    const { isNotifyLive } = await import("@/lib/notify");
    // Never log the token/link: reset URLs are credentials. In non-prod the
    // link is returned in the response body instead (see below).
    if (!isNotifyLive("email") && process.env.NODE_ENV === "production") {
      console.warn("[reset-link] email provider not configured — reset link undeliverable");
    }
    await sendNotification({
      channel: "email",
      to: user.email,
      subject: "Reset your Chap password",
      message: `Reset your Chap password (expires in 1 hour): ${link} — if you didn't ask, ignore this.`,
    }).catch(() => null);
    // Demo/dev: email never arrives (console-log provider), so hand the link
    // back to the requester instead of stranding them. Production stays generic.
    if (process.env.NODE_ENV !== "production" && !isNotifyLive("email")) {
      return NextResponse.json({ ok: true, message: "Demo mode: email is logged — use the link below.", demoLink: link });
    }
  }
  return NextResponse.json({ ok: true, message: "If that email has an account, a reset link is on its way." });
}
