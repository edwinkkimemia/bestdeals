import { LISTINGS, type Listing } from "@/data/catalog";
import { countyMatches } from "@/lib/kenya";

export type SearchParams = {
  q?: string;
  category?: string;
  subcategory?: string;
  min?: number;
  max?: number;
  condition?: string;
  county?: string;
  town?: string;
  type?: "product" | "classified" | "service" | "all";
  seller?: "individual" | "business" | "all";
  /** Only listings posted within the last N hours (e.g. 24, 168, 720). */
  postedWithinHours?: number;
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
  const hay = `${l.title} ${l.description} ${l.subcategory ?? ""} ${Object.values(l.attributes).join(" ")} ${l.town} ${l.county}`.toLowerCase();
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
  const sub = (p.subcategory ?? "").trim().toLowerCase();
  const town = (p.town ?? "").trim().toLowerCase();
  let items = LISTINGS.filter((l) => {
    if (p.category && p.category !== "all" && l.categorySlug !== p.category) return false;
    if (sub && sub !== "all" && (l.subcategory ?? "").trim().toLowerCase() !== sub) return false;
    if (p.type && p.type !== "all" && l.listingType !== p.type) return false;
    if (p.seller && p.seller !== "all" && l.sellerType !== p.seller) return false;
    if (p.condition && p.condition !== "all" && l.condition !== p.condition) return false;
    // Case-insensitive; towns resolve to their county ("Eldoret" → "Uasin Gishu").
    if (!countyMatches(l.county, p.county ?? "all")) return false;
    if (town && town !== "all" && l.town.trim().toLowerCase() !== town) return false;
    if (p.min != null && l.price < p.min) return false;
    if (p.max != null && l.price > p.max) return false;
    if (p.postedWithinHours != null && p.postedWithinHours > 0) {
      const t = +new Date(l.createdAt);
      if (!Number.isFinite(t) || Date.now() - t > p.postedWithinHours * 3600_000) return false;
    }
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

/** Per-request shuffle for rails: Featured/promoted items always lead, everything else mixes freshly on every refresh. */
export function shuffleFeaturedFirst<T extends { featured?: boolean }>(items: T[]): T[] {
  const feat = items.filter((l) => l.featured);
  const rest = items.filter((l) => !l.featured);
  shuffleInPlace(feat);
  shuffleInPlace(rest);
  return [...feat, ...rest];
}

/** Deterministic ranking for search pages: TOP pins → Featured → relevance → newest.
 * Stable across refreshes (no Math.random) so pagination doesn't reshuffle.
 */
export function rankDeterministic<T extends { featured?: boolean; topPinned?: boolean; createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.topPinned ? 1 : 0;
    const tb = b.topPinned ? 1 : 0;
    if (ta !== tb) return tb - ta;
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const da = a.createdAt ? +new Date(a.createdAt) : 0;
    const db = b.createdAt ? +new Date(b.createdAt) : 0;
    return db - da;
  });
}

/** Seed-stable shuffle for rails that must not jump between paginations. */
export function shuffleSeeded<T>(items: T[], seed = 42): T[] {
  const arr = [...items];
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
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

/** Async search merging static catalogue + live store listings (active only).
 * Store listings are converted to the catalogue Listing shape so existing UI works.
 */
export async function searchAll(p: SearchParams): Promise<{ items: Listing[]; total: number; page: number; perPage: number }> {
  const base = searchListings(p);
  try {
    const { getStore } = await import("./store");
    const store = getStore();
    const live = await store.listListingsByStatus("active").catch(() => []);
    if (live.length === 0) return base;
    const tokens = expandQuery(p.q ?? "");
    const sub = (p.subcategory ?? "").trim().toLowerCase();
    const town = (p.town ?? "").trim().toLowerCase();
    const { countyMatches } = await import("./kenya");
    const mapped: Listing[] = live
      .map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        categorySlug: s.categorySlug || "other",
        subcategory: s.subcategory,
        price: s.price,
        compareAt: s.compareAt,
        condition: (s.condition as Listing["condition"]) || "used_good",
        listingType: (s.type as Listing["listingType"]) || "product",
        transactionMethod: (s.txMethod as Listing["transactionMethod"]) || "buy_online",
        county: s.county,
        town: s.town,
        negotiable: s.negotiable,
        stock: s.stock,
        images: s.images && s.images.length > 0 ? s.images : ["/chaplogo.png"],
        sellerName: s.sellerName,
        ownerId: s.ownerId,
        sellerType: (s.shopSlug ? "business" : "individual") as Listing["sellerType"],
        shopSlug: s.shopSlug,
        verified: s.verified ?? true,
        featured: s.featured,
        createdAt: s.createdAt,
        attributes: s.attributes || {},
      }))
      .filter((l) => {
        if (p.category && p.category !== "all" && l.categorySlug !== p.category) return false;
        if (sub && sub !== "all" && (l.subcategory ?? "").trim().toLowerCase() !== sub) return false;
        if (p.type && p.type !== "all" && l.listingType !== p.type) return false;
        if (p.seller && p.seller !== "all" && l.sellerType !== p.seller) return false;
        if (p.condition && p.condition !== "all" && l.condition !== p.condition) return false;
        if (!countyMatches(l.county, p.county ?? "all")) return false;
        if (town && town !== "all" && l.town.trim().toLowerCase() !== town) return false;
        if (p.min != null && l.price < p.min) return false;
        if (p.max != null && l.price > p.max) return false;
        if (p.postedWithinHours != null && p.postedWithinHours > 0) {
          const t = +new Date(l.createdAt);
          if (!Number.isFinite(t) || Date.now() - t > p.postedWithinHours * 3600_000) return false;
        }
        if (tokens.length > 0 && score(l, tokens) <= 0) return false;
        return true;
      });
    // Merge + deterministic rank (TOP/featured first, then relevance/newest).
    const seen = new Set(base.items.map((l) => l.id));
    const extra = mapped.filter((l) => !seen.has(l.id));
    const sort = p.sort ?? "relevance";
    let items = [...base.items, ...extra];
    if (sort === "price_asc") items = [...items].sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") items = [...items].sort((a, b) => b.price - a.price);
    else if (sort === "newest") items = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else items = [...items].sort((a, b) => score(b, tokens) - score(a, tokens) || +new Date(b.createdAt) - +new Date(a.createdAt));
    // TOP pins lead deterministically — kinds come from live promos (a
    // listing object never carries one, so reading it off was a no-op).
    const kinds = await store.livePromoKinds(items.map((l) => l.id)).catch(() => new Map<string, string>());
    items = rankDeterministic(items.map((l) => ({ ...l, topPinned: kinds.get(l.id) === "top" }))) as typeof items;
    // Badges follow the live user record, not the catalogue flag.
    try {
      const { withLiveVerification } = await import("./live-listings");
      items = await withLiveVerification(items);
    } catch {}
    const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
    const page = Math.max(p.page ?? 1, 1);
    return { items: items.slice((page - 1) * perPage, page * perPage), total: items.length, page, perPage };
  } catch {
    return base;
  }
}

/** Suggest including live store titles (async, falls back to static). */
export async function suggestionsAll(q: string, limit = 7): Promise<string[]> {
  const base = suggestions(q, limit);
  try {
    const { getStore } = await import("./store");
    const live = await getStore().listListingsByStatus("active").catch(() => []);
    const t = q.trim().toLowerCase();
    if (!t || live.length === 0) return base;
    const extra = live.map((l) => l.title).filter((s) => s.toLowerCase().includes(t));
    const hits = [...new Set([...base, ...extra])];
    hits.sort((a, b) => Number(!a.toLowerCase().startsWith(t)) - Number(!b.toLowerCase().startsWith(t)));
    return hits.slice(0, limit);
  } catch {
    return base;
  }
}
