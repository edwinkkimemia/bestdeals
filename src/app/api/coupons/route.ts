import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

/** Public: active coupon codes (code + thresholds only — no internals). */
export async function GET() {
  const items = (await getStore().listCoupons()).filter((c) => c.active);
  return NextResponse.json({ items: items.map((c) => ({ code: c.code, value: c.value, minSpend: c.minSpend })) });
}
