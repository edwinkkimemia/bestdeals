import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { readPurposeToken } from "@/lib/auth-tokens";

const schema = z.object({ token: z.string().min(1) });

/** Confirm an email address with a verification token. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "auth:email-verify"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  const data = await readPurposeToken(parsed.data.token, "email-verify");
  if (!data) return NextResponse.json({ error: "This link is invalid or expired. Request a new one." }, { status: 400 });
  const store = getStore();
  const user = await store.findUserById(data.userId).catch(() => null);
  if (!user || user.email.toLowerCase() !== data.email.toLowerCase()) {
    return NextResponse.json({ error: "This link is invalid or expired. Request a new one." }, { status: 400 });
  }
  await store.setEmailVerified(user.id, true);
  return NextResponse.json({ ok: true, message: "Email verified ✓ — thanks!" });
}
