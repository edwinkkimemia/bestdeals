import { NextRequest, NextResponse } from "next/server";
import { priceHint, priceTrends, nicheScore } from "@/lib/insights";
import { getStore } from "@/lib/store";

/** Pricing intel: ?op=hint&category=..&price=.. | ?op=trends&category=.. | ?op=niche&q=.. */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const op = q.get("op") || "hint";
  if (op === "hint") {
    const category = q.get("category") || "";
    const price = Number(q.get("price") || 0);
    return NextResponse.json(priceHint(category, price));
  }
  if (op === "trends") {
    return NextResponse.json({ trends: priceTrends(q.get("category") || "") });
  }
  if (op === "niche") {
    const keyword = q.get("q") || "";
    // Supply = live store listings + catalogue matches (cheap heuristic).
    const store = getStore();
    const mine = await store.listListingsByStatus("active").catch(() => []);
    const { LISTINGS } = await import("@/data/catalog");
    const k = keyword.toLowerCase();
    const supply = [...mine, ...LISTINGS].filter((l) => `${l.title} ${l.description}`.toLowerCase().includes(k)).length;
    return NextResponse.json({ keyword, supply, ...nicheScore(keyword, supply) });
  }
  return NextResponse.json({ error: "Unknown op." }, { status: 400 });
}
