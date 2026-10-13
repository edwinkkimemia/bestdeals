/** Pricing intel (Jiji-style price hint + trends + Scout-lite niche score).
 * Pure functions over catalogue prices + store listings so they work demo + PG.
 */
import { LISTINGS } from "@/data/catalog";

export function priceHint(categorySlug: string, price: number): { verdict: "great" | "fair" | "high"; median: number | null; blurb: string } {
  const peers = LISTINGS.filter((l) => l.categorySlug === categorySlug && l.price > 0).map((l) => l.price).sort((a, b) => a - b);
  if (peers.length < 3) return { verdict: "fair", median: null, blurb: "Not enough data yet — check similar ads." };
  const median = peers[Math.floor(peers.length / 2)];
  if (price <= median * 0.9) return { verdict: "great", median, blurb: "Great price — you should attract more buyers." };
  if (price <= median * 1.15) return { verdict: "fair", median, blurb: "Fair price — in line with similar ads." };
  return { verdict: "high", median, blurb: "Above market — consider lowering to sell faster." };
}

export function priceTrends(categorySlug: string, buckets = 5): { min: number; median: number; max: number; count: number } | null {
  const peers = LISTINGS.filter((l) => l.categorySlug === categorySlug && l.price > 0).map((l) => l.price).sort((a, b) => a - b);
  if (peers.length === 0) return null;
  void buckets;
  return { min: peers[0], median: peers[Math.floor(peers.length / 2)], max: peers[peers.length - 1], count: peers.length };
}

/** Niche Score 0-10: high demand (search hits) vs low supply (live ads). Heuristic demo. */
export function nicheScore(keyword: string, supply: number, demandHint = 50): { score: number; blurb: string } {
  const k = keyword.trim().length;
  if (k < 2) return { score: 0, blurb: "Type a keyword to score the niche." };
  const demand = Math.min(100, Math.max(5, demandHint));
  const s = Math.max(1, supply);
  const raw = Math.round((demand / (demand + s * 8)) * 10);
  const score = Math.min(10, Math.max(0, raw));
  return {
    score,
    blurb: score >= 7 ? "High opportunity — strong demand, few ads." : score >= 4 ? "Moderate — worth testing with a good price." : "Crowded — you'll need a boost or better price.",
  };
}
