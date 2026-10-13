import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { qualifyReferralsFor } from "@/lib/referrals";
import { hashPassword } from "@/lib/auth";
import { clearLoginFailures } from "@/lib/login-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({ id: z.string().min(1), verified: z.boolean() });

/** Admin-only: grant or revoke seller (ID) verification. Reason recorded via audit where supported. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide id + verified." }, { status: 400 });
  if (parsed.data.id === user.id) return NextResponse.json({ error: "You can't change your own verification." }, { status: 422 });
  const target = await getStore().findUserById(parsed.data.id);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  await getStore().setUserVerified(parsed.data.id, parsed.data.verified);
  if (parsed.data.verified) {
    await qualifyReferralsFor(parsed.data.id).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}

/** Admin-only: reset any user's password + clear their login lockout. */
export async function PUT(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const emailOrId = String(body.email || body.id || "").trim();
  const next = String(body.password || "").trim();
  if (!emailOrId || next.length < 8 || next.length > 72) {
    return NextResponse.json({ error: "Provide email/id + password (8–72 chars)." }, { status: 400 });
  }
  const store = getStore();
  const target =
    (await store.findUserById(emailOrId).catch(() => null)) ??
    (await store.findUserByEmail(emailOrId).catch(() => null));
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  await store.setUserPassword(target.id, await hashPassword(next));
  clearLoginFailures(target.email);
  await logAudit({ actorId: user.id, actorEmail: user.email, action: "user.password_reset", entity: "user", entityId: target.id }).catch(() => {});
  return NextResponse.json({ ok: true, email: target.email });
}

/** Admin-only: clear a login lockout without changing the password. */
export async function PATCH(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Provide email." }, { status: 400 });
  clearLoginFailures(email);
  await logAudit({ actorId: user.id, actorEmail: user.email, action: "user.unlock", entity: "user", entityId: email }).catch(() => {});
  return NextResponse.json({ ok: true });
}
