import { LISTINGS, SHOPS, type Listing } from "@/data/catalog";
import { countyMatches } from "@/lib/kenya";
import { relatedTier } from "@/lib/related";

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

/**
 * Short numeric terms like "2" are useful in "2 bedroom" but disastrous as
 * raw substrings: they match "128GB" and "2016". Require standalone numbers,
 * while keeping partial-word matching for ordinary terms ("sams" → Samsung).
 */
function tokenHit(text: string, token: string): boolean {
  if (/^\d+$/.test(token)) {
    return new RegExp(`(^|[^a-z0-9])${token}(?![a-z0-9])`).test(text);
  }
  // Match from the start of a word so "sams" still finds Samsung, but
  // "house" no longer matches "greenhouse" or "phone" matches "microphone".
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}`).test(text);
}

function textScore(l: Listing, tokens: string[]): number {
  const shopWords = (l.shopSlug ?? "").replace(/-/g, " ");
  // Seller/shop names are part of a listing's searchable identity — typing a
  // shop name should find its products, not just its storefront profile.
  const title = l.title.toLowerCase();
  const hay = `${l.title} ${l.description} ${l.subcategory ?? ""} ${Object.values(l.attributes).join(" ")} ${l.town} ${l.county} ${l.sellerName} ${shopWords}`.toLowerCase();
  let s = 0;
  let matchedWord = false;
  for (const t of tokens) {
    const inTitle = tokenHit(title, t);
    if (inTitle) s += 5;
    else if (tokenHit(hay, t)) s += 2;
    else continue;
    if (!/^\d+$/.test(t)) matchedWord = true;
  }
  // A numeric-only hit is not a real answer to a word query: "2 bedroom
  // Mtwapa" must not surface a phone because its warranty says "2 years".
  if (tokens.some((t) => !/^\d+$/.test(t)) && !matchedWord) return 0;
  return s;
}

function score(l: Listing, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const text = textScore(l, tokens);
  // Ranking bonuses (featured/verified) must never turn a non-match into a
  // match — otherwise every verified listing answers every unrelated query.
  if (text <= 0) return 0;
  let s = text;
  if (l.featured) s += 1.5;
  if (l.verified) s += 1;
  if (l.stock <= 0) s -= 5;
  return s;
}

/** All static-catalogue matches, ranked. Live listings are merged on top. */
function staticMatches(p: SearchParams): Listing[] {
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
  if (sort === "price_asc") items = [...items].sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") items = [...items].sort((a, b) => b.price - a.price);
  else if (sort === "newest") items = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  else items = relevanceRanked(items, tokens, (l) => score(l, tokens));
  return items;
}

/** PostgreSQL full-text would power this in production; demo ranks in-memory. Same interface. */
export function searchListings(p: SearchParams): {
  items: Listing[];
  total: number;
  page: number;
  perPage: number;
} {
  const items = staticMatches(p);
  const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
  const page = Math.max(p.page ?? 1, 1);
  const total = items.length;
  return { items: items.slice((page - 1) * perPage, page * perPage), total, page, perPage };
}

/**
 * Query-dominant category intent: the category (and subcategory) most
 * represented among genuine title hits. Free-text queries like "toyota
 * fielder" or "2 bedroom" carry no category name, so name-matching can't find
 * intent — but title hits cluster in one category, and tiering by that
 * cluster (same subcategory > same category > rest, mirroring related
 * items) keeps one strong outsider from outranking the pack on a title
 * keyword. Title-only (featured/verified bonuses elect spurious majorities),
 * needs ≥2 hits; null falls back to pure relevance.
 */
const normText = (s: string) => s.toLowerCase().replace(/[-_]+/g, " ");

/** Genuine query hit (title), ignoring featured/verified score bonuses. */
function titleHit(l: Pick<Listing, "title">, tokens: string[]): boolean {
  const t = normText(l.title);
  return tokens.some((tok) => {
    const term = normText(tok);
    if (!/^\d+$/.test(term) && term.length < 2) return false;
    return tokenHit(t, term);
  });
}

export function dominantIntent(
  scored: { l: Pick<Listing, "categorySlug" | "subcategory" | "title">; s: number }[],
  tokens: string[] = []
): {
  categorySlug: string;
  subcategory?: string;
} | null {
  const hits = scored.filter((x) => x.s > 0).slice(0, 12);
  if (hits.length === 0) return null;
  // Intent comes from genuine title matches only: featured/verified bonuses
  // (+2.5 with zero text match) can otherwise elect a spurious majority and
  // bury the true best hit beneath it.
  const strong = tokens.length > 0 ? hits.filter((x) => titleHit(x.l, tokens)) : hits;
  if (strong.length < 2) return null;
  const catCount = new Map<string, number>();
  for (const h of strong) catCount.set(h.l.categorySlug, (catCount.get(h.l.categorySlug) ?? 0) + 1);
  let topCat = "";
  let topN = 0;
  for (const [c, n] of catCount) {
    if (n > topN) {
      topN = n;
      topCat = c;
    }
  }
  if (topN < 2 || !topCat) return null;
  const subCount = new Map<string, number>();
  for (const h of strong) {
    if (h.l.categorySlug === topCat) {
      const sub = (h.l.subcategory ?? "").trim();
      if (sub) subCount.set(sub, (subCount.get(sub) ?? 0) + 1);
    }
  }
  let topSub = "";
  let topS = 0;
  for (const [s, n] of subCount) {
    if (n > topS) {
      topS = n;
      topSub = s;
    }
  }
  return { categorySlug: topCat, ...(topS >= 2 && topSub ? { subcategory: topSub } : {}) };
}

/** Relevance order with dominant-cluster tiering (stable within tiers). */
function relevanceRanked<T extends Pick<Listing, "categorySlug" | "subcategory" | "title">>(
  items: T[],
  tokens: string[],
  textScore: (l: T) => number
): T[] {
  const scored = items.map((l) => ({ l, s: textScore(l) }));
  const intent = tokens.length > 0 ? dominantIntent(scored, tokens) : null;
  scored.sort((a, b) => (intent ? relatedTier(a.l, intent) - relatedTier(b.l, intent) : 0) || b.s - a.s);
  return scored.map((x) => x.l);
}

/** Per-request shuffle for rails: Featured/promoted items always lead, everything else mixes freshly on every refresh. */
export function shuffleFeaturedFirst<T extends { featured?: boolean }>(items: T[]): T[] {
  const feat = items.filter((l) => l.featured);
  const rest = items.filter((l) => !l.featured);
  shuffleInPlace(feat);
  shuffleInPlace(rest);
  return [...feat, ...rest];
}

/** Deterministic browse ranking: TOP pins → Featured → newest.
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

/** Paid TOP pins lead, but free "featured" badges must not override textual
 * relevance. Used for keyword searches, where the exact match belongs first.
 */
export function pinTopResults<T extends { topPinned?: boolean }>(items: T[]): T[] {
  const top: T[] = [];
  const rest: T[] = [];
  for (const item of items) (item.topPinned ? top : rest).push(item);
  return [...top, ...rest];
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
  // Seller and shop names are searchable entities too — surface them in the
  // header autocomplete so a name search lands on the right profile.
  const people = [...LISTINGS.map((l) => l.sellerName), ...SHOPS.map((s) => s.name)];
  const hits = [...new Set([...titles, ...cats, ...people])].filter((s) => s.toLowerCase().includes(t));
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
        categorySlug: s.categorySlug || "",
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
    // Merge against ALL static matches, not just the current page — otherwise
    // totals and faceted counts change with page size. Dedupe by id and slug
    // so a seeded live twin never appears twice beside its catalogue copy.
    const staticItems = staticMatches(p);
    const seen = new Set(staticItems.flatMap((l) => [l.id, `slug:${l.slug}`]));
    const extra = mapped.filter((l) => !seen.has(l.id) && !seen.has(`slug:${l.slug}`));
    const sort = p.sort ?? "relevance";
    let items = [...staticItems, ...extra];
    if (sort === "price_asc") items = [...items].sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") items = [...items].sort((a, b) => b.price - a.price);
    else if (sort === "newest") items = [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else {
      // Same dominant-cluster tiering as the static path (recency breaks ties).
      const scored = items.map((l) => ({ l, s: score(l, tokens) }));
      const intent = tokens.length > 0 ? dominantIntent(scored, tokens) : null;
      scored.sort(
        (a, b) =>
          (intent ? relatedTier(a.l, intent) - relatedTier(b.l, intent) : 0) ||
          b.s - a.s ||
          +new Date(b.l.createdAt) - +new Date(a.l.createdAt)
      );
      items = scored.map((x) => x.l);
    }
    // TOP pins lead deterministically. For a keyword search only the paid TOP
    // pin may jump the queue: promoting every "featured" listing re-buried
    // exact matches beneath unrelated boosted products. Browse-style searches
    // (no query) still lead with featured inventory.
    const kinds = await store.livePromoKinds(items.map((l) => l.id)).catch(() => new Map<string, string>());
    const pinned = items.map((l) => ({ ...l, topPinned: kinds.get(l.id) === "top" }));
    items = (p.q?.trim() ? pinTopResults(pinned) : rankDeterministic(pinned)) as typeof items;
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
  const t = q.trim().toLowerCase();
  if (!t) return base;
  try {
    const { getStore } = await import("./store");
    const store = getStore();
    const [live, users, shops] = await Promise.all([
      store.listListingsByStatus("active").catch(() => []),
      store.listUsers().catch(() => []),
      store.listShops().catch(() => []),
    ]);
    const extra = [
      ...live.map((l) => l.title),
      ...users.flatMap((u) => [u.name, u.businessName].filter(Boolean) as string[]),
      ...shops.map((s) => s.name),
    ].filter((s) => s.toLowerCase().includes(t));
    const hits = [...new Set([...base, ...extra])];
    hits.sort((a, b) => Number(!a.toLowerCase().startsWith(t)) - Number(!b.toLowerCase().startsWith(t)));
    return hits.slice(0, limit);
  } catch {
    return base;
  }
}
