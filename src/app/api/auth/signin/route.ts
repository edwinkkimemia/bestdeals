import { NextRequest, NextResponse } from "next/server";
import { signinSchema } from "@/lib/validators";
import { verifyPassword, createSessionToken, SESSION_COOKIE, sessionCookieAttrs } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isAccountLocked, recordLoginFailure, clearLoginFailures, LOGIN_GUARD } from "@/lib/login-guard";
import { isDemoEmail, ensureDemoUsers } from "@/lib/demo-users";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:signin"), { limit: 15, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  // Per-account guard: slow down password guessing against a single address.
  const lock = isAccountLocked(email);
  if (lock.locked) {
    const mins = Math.max(1, Math.ceil((lock.retryAfterSec ?? LOGIN_GUARD.lockMs / 1000) / 60));
    return NextResponse.json({ error: `Too many wrong attempts. Try again in ~${mins} min, or reset your password.` }, { status: 429 });
  }
  const store = getStore();
  let found = await store.findUserByEmail(email);
  // Demo-mode safety net: in-memory users vanish on restart, so a demo login
  // after a redeploy would 401 even with the right password. Re-seed the
  // public demo roster on demand instead of failing.
  if (!found && isDemoEmail(email)) {
    await ensureDemoUsers(store).catch(() => null);
    found = await store.findUserByEmail(email);
  }
  if (!found || !(await verifyPassword(parsed.data.password, found.passwordHash))) {
    const r = recordLoginFailure(email);
    if (r.locked) {
      return NextResponse.json({ error: "Too many wrong attempts. Try again in ~15 min, or reset your password." }, { status: 429 });
    }
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  clearLoginFailures(email);
  const token = await createSessionToken({ id: found.id, name: found.name, email: found.email, phone: found.phone, role: found.role, verified: found.verified });
  const res = NextResponse.json({ ok: true, role: found.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieAttrs());
  return res;
}
