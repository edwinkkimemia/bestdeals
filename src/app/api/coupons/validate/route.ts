import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { COUPONS } from "@/data/catalog";

/** Validate a code against the current cart subtotal (server truth). */
export async function GET(req: NextRequest) {
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  const subtotal = Number(new URL(req.url).searchParams.get("subtotal") ?? 0);
  if (!code) return NextResponse.json({ valid: false, value: 0 });
  const stored = await getStore().getCoupon(code).catch(() => null);
  const fallback = COUPONS[code];
  const c = stored && stored.active
    ? { value: stored.value, minSpend: stored.minSpend }
    : fallback
      ? { value: fallback.value, minSpend: fallback.minSpend }
      : null;
  if (!c) return NextResponse.json({ valid: false, value: 0, error: "Invalid code." });
  if (subtotal < c.minSpend) {
    return NextResponse.json({ valid: false, value: 0, error: `Needs a minimum spend of ${c.minSpend.toLocaleString()} KES.` });
  }
  return NextResponse.json({ valid: true, value: Math.min(c.value, subtotal) });
}
