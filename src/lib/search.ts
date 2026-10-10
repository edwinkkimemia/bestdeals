import { LISTINGS, type Listing } from "@/data/catalog";
import { countyMatches } from "@/lib/kenya";

export type SearchParams = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  condition?: string;
  county?: string;
  type?: "product" | "classified" | "service" | "all";
  seller?: "individual" | "business" | "all";
  sort?: "relevance" | "newest" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
};

const SYNONYMS: Record<string, string[]> = {
  phone: ["smartphone", "mobile", "samsung", "tecno", "infinix", "iphone"],
  laptop: ["notebook", "hp", "lenovo", "dell", "macbook", "computer"],
  tv: ["television", "tcl", "hisense", "smart tv"],
  sofa: ["couch", "seats", "furniture"],
  car: ["vehicle", "toyota", "fielder", "fielder", "motor"],
  house: ["bedroom", "rental", "apartment", "property", "bedsitter"],
  job: ["hiring", "vacancy", "employment", "accountant"],
  cement: ["bamburi", "building", "hardware"],
};

function expandQuery(q: string): string[] {
  const base = q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set(base);
  for (const tok of base) {
    for (const [k, vs] of Object.entries(SYNONYMS)) {
      if (tok === k || vs.includes(tok)) {
        out.add(k);
        vs.forEach((v) => out.add(v));
      }
    }
  }
  return Array.from(out);
}

function score(l: Listing, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const hay = `${l.title} ${l.description} ${l.subcategory ?? ""} ${Object.values(l.attributes).join(" ")}`.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (l.title.toLowerCase().includes(t)) s += 5;
    else if (hay.includes(t)) s += 2;
  }
  if (l.featured) s += 1.5;
  if (l.verified) s += 1;
  if (l.stock <= 0) s -= 5;
  return s;
}

/** PostgreSQL full-text would power this in production; demo ranks in-memory. Same interface. */
export function searchListings(p: SearchParams): {
  items: Listing[];
  total: number;
  page: number;
  perPage: number;
} {
  const tokens = expandQuery(p.q ?? "");
  let items = LISTINGS.filter((l) => {
    if (p.category && p.category !== "all" && l.categorySlug !== p.category) return false;
    if (p.type && p.type !== "all" && l.listingType !== p.type) return false;
    if (p.seller && p.seller !== "all" && l.sellerType !== p.seller) return false;
    if (p.condition && p.condition !== "all" && l.condition !== p.condition) return false;
    // Case-insensitive; towns resolve to their county ("Eldoret" → "Uasin Gishu").
    if (!countyMatches(l.county, p.county ?? "all")) return false;
    if (p.min != null && l.price < p.min) return false;
    if (p.max != null && l.price > p.max) return false;
    if (tokens.length > 0 && score(l, tokens) <= 0) return false;
    return true;
  });

  const sort = p.sort ?? "relevance";
  items = [...items].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
    return score(b, tokens) - score(a, tokens);
  });

  const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
  const page = Math.max(p.page ?? 1, 1);
  const total = items.length;
  return { items: items.slice((page - 1) * perPage, page * perPage), total, page, perPage };
}

export function suggestions(q: string, limit = 7): string[] {
  const t = q.trim().toLowerCase();
  if (t.length < 1) return [];
  const titles = LISTINGS.map((l) => l.title);
  const cats = ["Phones & Tablets", "Automotive", "Property", "Fashion", "Laptops", "Services"];
  const hits = [...titles, ...cats].filter((s) => s.toLowerCase().includes(t));
  // Prefix matches first so early keystrokes already feel relevant.
  hits.sort((a, b) => Number(!a.toLowerCase().startsWith(t)) - Number(!b.toLowerCase().startsWith(t)));
  return hits.slice(0, limit);
}
