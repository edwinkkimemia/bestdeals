import { NextRequest, NextResponse } from "next/server";
import { signinSchema } from "@/lib/validators";
import { verifyPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:signin"), { limit: 15, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  const found = await getStore().findUserByEmail(parsed.data.email);
  if (!found || !(await verifyPassword(parsed.data.password, found.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const token = await createSessionToken({ id: found.id, name: found.name, email: found.email, phone: found.phone, role: found.role, verified: found.verified });
  const res = NextResponse.json({ ok: true, role: found.role });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
  return res;
}
