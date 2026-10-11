import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { COUPONS } from "@/data/catalog";

export const dynamic = "force-dynamic";

/** Public: active coupon codes (code + thresholds only — no internals). */
export async function GET() {
  try {
    const items = (await getStore().listCoupons()).filter((c) => c.active);
    return NextResponse.json({ items: items.map((c) => ({ code: c.code, value: c.value, minSpend: c.minSpend })) });
  } catch {
    // Build-time / unmigrated database: fall back to launch codes.
    const items = Object.values(COUPONS).map((c) => ({ code: c.code, value: c.value, minSpend: c.minSpend }));
    return NextResponse.json({ items });
  }
}
