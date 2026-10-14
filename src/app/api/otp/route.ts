import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const reqSchema = z.object({ phone: z.string().regex(/^(\+254|0)[17]\d{8}$/) });
const verSchema = z.object({
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/),
  code: z.string().regex(/^\d{6}$/),
});

/** Request a 6-digit verification code for guest order/chat lookup. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "otp:req"), { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many codes. Try again later." }, { status: 429 });
  const parsed = reqSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Use a valid Kenyan phone e.g. 0712345678." }, { status: 400 });
  const { requestOtp } = await import("@/lib/otp");
  const r = await requestOtp(parsed.data.phone);
  return NextResponse.json({ ok: true, ...(r.demoCode ? { demoCode: r.demoCode } : {}) });
}

/** Verify the code — sets a 30-min verified window for this phone. */
export async function PUT(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "otp:verify"), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const parsed = verSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  const { verifyOtp } = await import("@/lib/otp");
  const ok = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (!ok) return NextResponse.json({ error: "Wrong or expired code." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
