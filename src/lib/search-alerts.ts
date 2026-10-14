/**
 * Saved-search + wishlist alert fanout (Jiji-style "new ad matches what you
 * were looking for" + price-drop bells).
 *
 * Saved searches live in per-user settings (`saved_searches:<userId>`,
 * see /api/saved-searches) and wishlists in `wishlist:<userId>`
 * (see /api/wishlist). On listing approve / price edit we fan out in-app
 * `alert` notifications — best-effort, capped, never blocking the writer.
 */

import { getStore, type Store } from "./store";
import { countyMatches } from "./kenya";
import { formatKES } from "./format";

export type AlertQuery = {
  q?: string;
  category?: string;
  subcategory?: string;
  min?: number;
  max?: number;
  county?: string;
  town?: string;
  condition?: string;
  type?: string;
};

export type AlertListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug?: string;
  subcategory?: string;
  price: number;
  county: string;
  town: string;
  condition?: string;
  type?: string;
  ownerId?: string;
};

type SavedRow = {
  id: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
  lastAlertAt?: string;
};

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" && v.trim() === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function asAlertQuery(raw: Record<string, unknown>): AlertQuery {
  return {
    q: typeof raw.q === "string" ? raw.q : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    subcategory: typeof raw.subcategory === "string" ? raw.subcategory : undefined,
    min: num(raw.min),
    max: num(raw.max),
    county: typeof raw.county === "string" ? raw.county : undefined,
    town: typeof raw.town === "string" ? raw.town : undefined,
    condition: typeof raw.condition === "string" ? raw.condition : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
  };
}

/** Does one listing satisfy one saved search? Mirrors lib/search filter semantics. */
export function listingMatchesQuery(l: AlertListing, q: AlertQuery): boolean {
  if (q.category && q.category !== "all" && norm(l.categorySlug) !== norm(q.category)) return false;
  if (q.subcategory && q.subcategory !== "all" && norm(l.subcategory) !== norm(q.subcategory)) return false;
  if (q.type && q.type !== "all" && norm(l.type) !== norm(q.type)) return false;
  if (q.condition && q.condition !== "all" && norm(l.condition) !== norm(q.condition)) return false;
  if (q.min != null && Number.isFinite(q.min) && l.price < (q.min as number)) return false;
  if (q.max != null && Number.isFinite(q.max) && l.price > (q.max as number)) return false;
  if (q.county && q.county !== "all") {
    try {
      if (!countyMatches(l.county, q.county)) return false;
    } catch {
      if (norm(l.county) !== norm(q.county)) return false;
    }
  }
  if (q.town && q.town !== "all" && norm(l.town) !== norm(q.town)) return false;
  const qq = (q.q ?? "").trim().toLowerCase();
  if (qq) {
    const tokens = qq.split(/\s+/).filter(Boolean);
    const hay = `${l.title} ${l.description} ${l.subcategory ?? ""} ${l.town} ${l.county}`.toLowerCase();
    if (!tokens.some((t) => hay.includes(t))) return false;
  }
  return true;
}

/** Human summary for "matches your saved search …" bodies + dashboard rows. */
export function describeQuery(q: AlertQuery): string {
  const bits: string[] = [];
  if (q.q?.trim()) bits.push(`“${q.q.trim().slice(0, 40)}”`);
  if (q.category && q.category !== "all") bits.push(q.category);
  if (q.town && q.town !== "all") bits.push(q.town);
  else if (q.county && q.county !== "all") bits.push(q.county);
  if (q.max != null) bits.push(`under ${formatKES(q.max)}`);
  else if (q.min != null) bits.push(`over ${formatKES(q.min)}`);
  return bits.length > 0 ? bits.join(" · ") : "your saved search";
}

export function listingLink(l: Pick<AlertListing, "slug" | "type">): string {
  const t = norm(l.type);
  if (t === "classified") return `/classifieds/${l.slug}`;
  if (t === "service") return `/services/${l.slug}`;
  return `/product/${l.slug}`;
}

async function readSaved(store: Store, userId: string): Promise<SavedRow[]> {
  const v = (await store.getSetting(`saved_searches:${userId}`).catch(() => null)) as SavedRow[] | null;
  return Array.isArray(v) ? v : [];
}

async function readSent(store: Store, userId: string): Promise<string[]> {
  const v = (await store.getSetting(`alerts_sent:${userId}`).catch(() => null)) as string[] | null;
  return Array.isArray(v) ? v : [];
}

/**
 * Notify every user whose saved search matches a newly-approved listing.
 * Skips the owner, caps at 50 bells, dedupes per listing per user.
 */
export async function fanoutNewListingAlert(
  listing: AlertListing,
  storeOverride?: Store
): Promise<number> {
  const store = storeOverride ?? getStore();
  let users: { id: string }[] = [];
  try {
    users = await store.listUsers();
  } catch {
    return 0;
  }
  const link = listingLink(listing);
  let sent = 0;
  for (const u of users.slice(0, 200)) {
    if (sent >= 50) break;
    if (!u?.id || u.id === listing.ownerId) continue;
    let saved: SavedRow[];
    try {
      saved = await readSaved(store, u.id);
    } catch {
      continue;
    }
    if (saved.length === 0) continue;
    let seen: string[];
    try {
      seen = await readSent(store, u.id);
    } catch {
      seen = [];
    }
    if (seen.includes(listing.id)) continue;
    const hit = saved.find((s) => {
      try {
        return listingMatchesQuery(listing, asAlertQuery(s.query ?? {}));
      } catch {
        return false;
      }
    });
    if (!hit) continue;
    try {
      await store.createNotification({
        userId: u.id,
        type: "alert",
        title: `New ad: ${listing.title.slice(0, 80)}`,
        body: `Matches ${describeQuery(asAlertQuery(hit.query ?? {}))} — ${formatKES(listing.price)}.`,
        link,
      });
      sent += 1;
      const nextSeen = [...seen, listing.id].slice(-200);
      await store.setSetting(`alerts_sent:${u.id}`, nextSeen).catch(() => {});
      const nextSaved = saved.map((s) =>
        s.id === hit.id ? { ...s, lastAlertAt: new Date().toISOString() } : s
      );
      await store.setSetting(`saved_searches:${u.id}`, nextSaved).catch(() => {});
    } catch {}
  }
  return sent;
}

/**
 * Price-drop + newly-in-budget bells on a seller price edit.
 * - Wishlist holders of this listing get the drop (except the owner).
 * - Saved-search owners whose `max` newly covers the price get "now in budget".
 */
export async function fanoutPriceDrop(
  listing: AlertListing,
  oldPrice: number,
  storeOverride?: Store
): Promise<number> {
  const store = storeOverride ?? getStore();
  const next = listing.price;
  if (!Number.isFinite(oldPrice) || !Number.isFinite(next) || next >= oldPrice || next <= 0) return 0;
  const pct = Math.round(((oldPrice - next) / oldPrice) * 100);
  const link = listingLink(listing);
  let users: { id: string }[] = [];
  try {
    users = await store.listUsers();
  } catch {
    return 0;
  }
  let sent = 0;
  for (const u of users.slice(0, 200)) {
    if (sent >= 50) break;
    if (!u?.id || u.id === listing.ownerId) continue;
    // 1) Wishlist price drop.
    try {
      const wish = (await store.getSetting(`wishlist:${u.id}`).catch(() => null)) as string[] | null;
      if (Array.isArray(wish) && wish.includes(listing.id)) {
        const key = `${listing.id}:${next}`;
        const done = (await store.getSetting(`price_alerts_sent:${u.id}`).catch(() => null)) as string[] | null;
        const arr = Array.isArray(done) ? done : [];
        if (!arr.includes(key)) {
          await store.createNotification({
            userId: u.id,
            type: "alert",
            title: `Price drop: ${listing.title.slice(0, 70)}`,
            body: `Was ${formatKES(oldPrice)}, now ${formatKES(next)}${pct > 0 ? ` (−${pct}%)` : ""}.`,
            link,
          });
          sent += 1;
          await store.setSetting(`price_alerts_sent:${u.id}`, [...arr, key].slice(-200)).catch(() => {});
          continue; // one bell per user per edit is enough
        }
      }
    } catch {}
    // 2) Newly in budget for a max-filtered saved search.
    try {
      const saved = await readSaved(store, u.id);
      const hit = saved.find((s) => {
        try {
          const q = asAlertQuery(s.query ?? {});
          if (q.max == null || !Number.isFinite(q.max)) return false;
          if (!(oldPrice > (q.max as number) && next <= (q.max as number))) return false;
          return listingMatchesQuery({ ...listing }, { ...q, max: undefined });
        } catch {
          return false;
        }
      });
      if (hit) {
        await store.createNotification({
          userId: u.id,
          type: "alert",
          title: `Now in your budget: ${listing.title.slice(0, 70)}`,
          body: `“${hit.name.slice(0, 40)}” — now ${formatKES(next)} (was ${formatKES(oldPrice)}).`,
          link,
        });
        sent += 1;
      }
    } catch {}
  }
  return sent;
}
