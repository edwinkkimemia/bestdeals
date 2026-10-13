import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validators";
import { hashPassword, createSessionToken, SESSION_COOKIE, sessionCookieAttrs } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { createPurposeToken } from "@/lib/auth-tokens";
import { sendNotification } from "@/lib/notify";

const isAdminEmail = (email: string) =>
  (process.env.ADMIN_EMAILS || "admin@chap.co.ke").split(",").map((s) => s.trim().toLowerCase()).includes(email.toLowerCase());

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:signup"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  // Admin kill-switch (Admin → Settings). Unset defaults to open.
  const regOpen = await getStore().getSetting("registrations_open").catch(() => null);
  if (regOpen === "0" || regOpen === false) {
    return NextResponse.json({ error: "Registrations are currently closed. Please check back soon." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const name = parsed.data.name.trim();
  const businessName = (parsed.data.businessName ?? "").trim();
  const email = parsed.data.email.trim().toLowerCase();
  const phone = parsed.data.phone.trim();
  const { password, sellerKind } = parsed.data;
  if (sellerKind === "business" && businessName.length < 2) {
    return NextResponse.json({ error: "Enter your business name — it's shown on your shop and listings." }, { status: 400 });
  }
  const store = getStore();
  if (await store.findUserByEmail(email)) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const role = (isAdminEmail(email) ? "ADMIN" : "SELLER") as "SELLER" | "ADMIN";
  const user = await store.createUser({ name, businessName: businessName || undefined, email, phone, role, verified: false, emailVerified: false, sellerKind, passwordHash: await hashPassword(password) });
  // Referral attribution (opaque codes + legacy ids; fraud-guarded, never fails signup).
  const ref = (parsed.data.ref ?? "").trim();
  if (ref) {
    try {
      const { resolveReferrer } = await import("@/lib/referrals");
      const referrerId = await resolveReferrer(ref, store);
      if (referrerId && referrerId !== user.id) {
        // Basic fraud: one signup per IP per hour counts (settings-backed counter).
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const fk = `ref_fraud:${ip}`;
        const n = Number(await store.getSetting(fk).catch(() => 0)) || 0;
        if (n < 5) {
          await store.setSetting(fk, n + 1).catch(() => {});
          await store.createReferral({ referrerUserId: referrerId, referredUserId: user.id });
        }
      }
    } catch {}
  }
  const token = await createSessionToken({ id: user.id, name, email, phone, role, verified: false });
  // Link any guest chats started with this number before registering.
  await store.claimGuestConversations(user.id, phone).catch(() => null);
  // Welcome email-verification link. Awaited (not queued): serverless functions
  // can freeze before background work finishes, silently dropping the email.
  try {
    const vToken = await createPurposeToken({ purpose: "email-verify", userId: user.id, email });
    const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    await sendNotification({
      channel: "email",
      to: email,
      subject: "Verify your Chap email",
      message: `Welcome to Chap ✓ — confirm your email (expires in 24 hours): ${base}/auth/email/verify?token=${encodeURIComponent(vToken)}`,
    });
  } catch {}
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieAttrs());
  return res;
}
