import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validators";
import { hashPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const isAdminEmail = (email: string) =>
  (process.env.ADMIN_EMAILS || "admin@chap.co.ke").split(",").map((s) => s.trim().toLowerCase()).includes(email.toLowerCase());

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:signup"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const { name, email, phone, password } = parsed.data;
  const store = getStore();
  if (await store.findUserByEmail(email)) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const role = (isAdminEmail(email) ? "ADMIN" : "SELLER") as "SELLER" | "ADMIN";
  const user = await store.createUser({ name, email, phone, role, verified: false, passwordHash: await hashPassword(password) });
  const token = await createSessionToken({ id: user.id, name, email, phone, role, verified: false });
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
  return res;
}
