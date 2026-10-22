import { NextRequest, NextResponse } from "next/server";
import { searchAll, type SearchParams } from "@/lib/search";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Public read feed for first-party clients (Android app) and embeds.
 * List (q/type/category/county/sort/page) via the same ranked search as the
 * site; single item via ?slug= (active only for strangers — previews stay
 * gated by resolveStoreDetail, same as the web pages).
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "feed"), { limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const q = new URL(req.url).searchParams;
  const slug = (q.get("slug") || q.get("id") || "").trim();
  if (slug) {
    const { getListing } = await import("@/data/catalog");
    const hit = getListing(slug);
    if (hit) {
      const { relatedWithLive } = await import("@/lib/live-listings");
      const { main } = await relatedWithLive(hit);
      return NextResponse.json({ item: main });
    }
    const { resolveStoreDetail } = await import("@/lib/live-listings");
    const resolved = await resolveStoreDetail(slug);
    if (!resolved) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ item: resolved.listing, previewStatus: resolved.previewStatus });
  }
  const params: SearchParams = {
    q: q.get("q") ?? "",
    category: q.get("category") ?? "all",
    subcategory: q.get("subcategory") ?? "all",
    county: q.get("county") ?? "all",
    town: q.get("town") ?? "all",
    type: (q.get("type") as SearchParams["type"]) ?? "all",
    sort: (q.get("sort") as SearchParams["sort"]) ?? "relevance",
    page: Math.max(1, Number(q.get("page") ?? "1") || 1),
    perPage: Math.min(60, Math.max(1, Number(q.get("per") ?? "24") || 24)),
  };
  const r = await searchAll(params);
  return NextResponse.json(r);
}
