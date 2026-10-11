import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const schema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Z0-9]+$/i, "Letters and numbers only"),
  value: z.coerce.number().int().min(1).max(1_000_000).optional(),
  minSpend: z.coerce.number().int().min(0).max(100_000_000).optional(),
  active: z.boolean().optional(),
});

/** Admin-only: list all coupons (including inactive). */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ items: await getStore().listCoupons() });
}

/** Admin-only: create/update a coupon, or flip `active` with {code, active}. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  const store = getStore();
  const existing = await store.getCoupon(parsed.data.code);
  const rec = await store.upsertCoupon({
    code: parsed.data.code,
    value: parsed.data.value ?? existing?.value ?? 0,
    minSpend: parsed.data.minSpend ?? existing?.minSpend ?? 0,
    active: parsed.data.active ?? existing?.active ?? true,
  });
  if (!rec.value) return NextResponse.json({ error: "Set a discount value in KES." }, { status: 400 });
  return NextResponse.json({ ok: true, item: rec });
}
