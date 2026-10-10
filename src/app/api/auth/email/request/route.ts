import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createPurposeToken } from "@/lib/auth-tokens";
import { sendNotification } from "@/lib/notify";

/** Resend the email-verification link to the signed-in user's address. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `auth:email-req:${user.id}`), { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  const fresh = await getStore().findUserById(user.id).catch(() => null);
  if (!fresh) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (fresh.emailVerified) return NextResponse.json({ ok: true, already: true, message: "Email already verified ✓" });
  const token = await createPurposeToken({ purpose: "email-verify", userId: fresh.id, email: fresh.email });
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const link = `${base}/auth/email/verify?token=${encodeURIComponent(token)}`;
  await sendNotification({
    channel: "email",
    to: fresh.email,
    subject: "Verify your Chap email",
    message: `Confirm your Chap email (expires in 24 hours): ${link} — if you didn't sign up, ignore this.`,
  }).catch(() => null);
  return NextResponse.json({ ok: true, message: "Verification link sent — check your inbox." });
}
