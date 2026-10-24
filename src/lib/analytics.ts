/**
 * Product-view analytics: privacy-friendly, aggregate-only.
 * - One row per listing view (no IPs stored — only a random visitor id,
 *   optional logged-in viewer id, referrer host and truncated user-agent).
 * - Works in demo mode (in-memory) and PostgreSQL (ListingView table).
 *   Prisma reads/writes are best-effort: if the table doesn't exist yet
 *   (migration not applied) or the DB is unreachable, we fall back to memory.
 */
import { db } from "./db";
import { uid } from "./utils";
import { getStore } from "./store";
import { LISTINGS, getListing } from "@/data/catalog";

export type ViewEvent = {
  id: string;
  listingId: string;
  viewerId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  createdAt: string; // ISO
};

export type DailyPoint = { date: string; views: number; uniques: number };

export type ListingStat = {
  listingId: string;
  views: number;
  uniques: number;
  views7: number;
  uniques7: number;
  views30: number;
  daily: DailyPoint[];
};

export type SellerAnalytics = {
  rangeDays: number;
  totalViews: number;
  uniqueViewers: number;
  views7: number;
  daily: DailyPoint[];
  perListing: (ListingStat & { title?: string })[];
  topReferrers: { source: string; count: number }[];
  funnel: { views: number; enquiries: number; orders: number; reveals?: number; conversions?: number };
};

export type PlatformAnalytics = {
  rangeDays: number;
  totalViews: number;
  uniqueViewers: number;
  viewedListings: number;
  daily: DailyPoint[];
  topListings: { listingId: string; title?: string; sellerName?: string; views: number; uniques: number }[];
  topReferrers: { source: string; count: number }[];
};

export const ANALYTICS_DEDUP_MS = 30 * 60 * 1000; // same visitor + listing within 30 min = 1 view
const MEMORY_CAP = 50_000;

/* ------------------------- in-memory fallback ------------------------- */

// Keep the fallback on globalThis: Next.js bundles each route/page separately,
// so a module-level array is duplicated per bundle and views recorded by the
// track API would never appear in the analytics pages. A process-wide singleton
// keeps demo mode working across routes (a real DB is still required across
// serverless instances).
type MemoryState = { events: ViewEvent[]; dedup: Map<string, number> };
const root = globalThis as unknown as { __chapAnalyticsMemory?: MemoryState };
const state =
  root.__chapAnalyticsMemory ??
  (root.__chapAnalyticsMemory = { events: [], dedup: new Map<string, number>() });
const memory = state.events;
const dedup = state.dedup;

export function resetAnalyticsMemory(): void {
  memory.length = 0;
  dedup.clear();
}

function pruneMemory(): void {
  if (memory.length > MEMORY_CAP) memory.splice(0, memory.length - MEMORY_CAP);
  // Drop stale dedup keys (keeps map small per-process).
  const now = Date.now();
  for (const [k, t] of dedup) if (now - t > ANALYTICS_DEDUP_MS) dedup.delete(k);
}

/* ------------------------------ helpers ------------------------------- */

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function lastNDates(n: number, now = Date.now()): string[] {
  const out: string[] = [];
  const base = new Date(now);
  base.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    out.push(dayKey(new Date(base.getTime() - i * 86400_000)));
  }
  return out;
}

function identityOf(e: Pick<ViewEvent, "viewerId" | "sessionId" | "id">): string {
  return e.viewerId || e.sessionId || e.id;
}

/** Collapse a referrer URL to a readable source label. */
export function referrerSource(ref?: string): string {
  if (!ref) return "Direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (!host) return "Direct";
    if (host.includes("chap.co.ke") || host.includes("localhost")) return "Chap browse";
    if (host.includes("google.")) return "Google";
    if (host.includes("facebook.") || host === "fb.me") return "Facebook";
    if (host.includes("instagram.")) return "Instagram";
    if (host.includes("tiktok.")) return "TikTok";
    if (host.includes("whatsapp.")) return "WhatsApp";
    if (host.includes("t.me") || host.includes("telegram.")) return "Telegram";
    if (host.includes("x.com") || host.includes("twitter.")) return "X";
    if (host.includes("youtube.") || host.includes("youtu.be")) return "YouTube";
    return host;
  } catch {
    return "Direct";
  }
}

const BOT_RE =
  /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|ccbot|claudebot|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|outbrain|pingdom|headlesschrome|lighthouse|pagespeed/i;

export function isBotUserAgent(ua?: string | null): boolean {
  if (!ua) return false;
  return BOT_RE.test(ua);
}

/* --------------------------- pure aggregation -------------------------- */

export function aggregateDaily(events: ViewEvent[], days: number, now = Date.now()): DailyPoint[] {
  const keys = lastNDates(days, now);
  const buckets = new Map(keys.map((k) => [k, { views: 0, ids: new Set<string>() }]));
  const since = now - days * 86400_000;
  for (const e of events) {
    const t = +new Date(e.createdAt);
    if (!Number.isFinite(t) || t < since || t > now + 60_000) continue;
    const k = dayKey(new Date(t));
    const b = buckets.get(k);
    if (!b) continue;
    b.views += 1;
    b.ids.add(identityOf(e));
  }
  return keys.map((date) => ({ date, views: buckets.get(date)!.views, uniques: buckets.get(date)!.ids.size }));
}

export function summarizeListing(events: ViewEvent[], listingId: string, days: number, now = Date.now()): ListingStat {
  const mine = events.filter((e) => e.listingId === listingId);
  const inRange = (n: number) => mine.filter((e) => +new Date(e.createdAt) >= now - n * 86400_000);
  const last7 = inRange(7);
  const last30 = inRange(30);
  return {
    listingId,
    views: mine.length,
    uniques: new Set(mine.map(identityOf)).size,
    views7: last7.length,
    uniques7: new Set(last7.map(identityOf)).size,
    views30: last30.length,
    daily: aggregateDaily(mine, Math.min(Math.max(days, 1), 90), now),
  };
}

export function topReferrers(events: ViewEvent[], limit = 8): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const s = referrerSource(e.referrer);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ------------------------------ persistence ---------------------------- */

function prismaViews(): {
  create: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown[]>;
} | null {
  try {
    const client = db() as Record<string, unknown> | null;
    const table = client?.["listingView"] as
      | { create: (args: unknown) => Promise<unknown>; findMany: (args: unknown) => Promise<unknown[]> }
      | undefined;
    // Old generated clients (before `prisma generate` picks up ListingView) expose no table.
    if (!table || typeof table.create !== "function") return null;
    return table;
  } catch {
    return null;
  }
}

type ViewRow = {
  id: string;
  listingId: string;
  viewerId: string | null;
  sessionId: string | null;
  referrer: string | null;
  userAgent: string | null;
  createdAt: Date;
};

const toEvent = (r: ViewRow): ViewEvent => ({
  id: r.id,
  listingId: r.listingId,
  viewerId: r.viewerId ?? undefined,
  sessionId: r.sessionId ?? undefined,
  referrer: r.referrer ?? undefined,
  userAgent: r.userAgent ?? undefined,
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
});

/**
 * Record a view. Returns { deduped: true } when the same visitor already
 * counted this listing inside the dedup window (no new row written).
 */
export async function recordListingView(input: {
  listingId: string;
  viewerId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
}): Promise<{ deduped: boolean }> {
  const listingId = String(input.listingId ?? "").slice(0, 64);
  if (!listingId) return { deduped: true };
  const visitor = input.viewerId || input.sessionId || "anon";
  const key = `${visitor}:${listingId}`;
  const now = Date.now();
  const last = dedup.get(key);
  if (last && now - last < ANALYTICS_DEDUP_MS) return { deduped: true };
  dedup.set(key, now);

  const event: ViewEvent = {
    id: uid("view"),
    listingId,
    viewerId: input.viewerId?.slice(0, 64),
    sessionId: input.sessionId?.slice(0, 64),
    referrer: input.referrer?.slice(0, 300),
    userAgent: input.userAgent?.slice(0, 160),
    createdAt: new Date(now).toISOString(),
  };
  memory.push(event);
  pruneMemory();

  const table = prismaViews();
  if (table) {
    try {
      await table.create({
        data: {
          listingId: event.listingId,
          viewerId: event.viewerId ?? null,
          sessionId: event.sessionId ?? null,
          referrer: event.referrer ?? null,
          userAgent: event.userAgent ?? null,
        },
      });
    } catch {
      // Table missing (migration pending) or DB down — memory already holds it.
    }
  }
  return { deduped: false };
}

async function readViews(opts: { listingIds?: string[]; since: number; take?: number }): Promise<ViewEvent[]> {
  const table = prismaViews();
  if (table) {
    try {
      const where: Record<string, unknown> = { createdAt: { gte: new Date(opts.since) } };
      if (opts.listingIds && opts.listingIds.length > 0) where["listingId"] = { in: opts.listingIds };
      const rows = (await table.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: opts.take ?? 20_000,
        select: { id: true, listingId: true, viewerId: true, sessionId: true, referrer: true, userAgent: true, createdAt: true },
      })) as unknown as ViewRow[];
      return rows.map(toEvent);
    } catch {
      // Fall through to memory.
    }
  }
  return memory.filter(
    (e) =>
      +new Date(e.createdAt) >= opts.since &&
      (!opts.listingIds || opts.listingIds.length === 0 || opts.listingIds.includes(e.listingId))
  );
}

/* ------------------------------- rollups ------------------------------- */

export async function getListingsStats(
  listingIds: string[],
  days = 30,
  now = Date.now()
): Promise<{ perListing: ListingStat[]; totalViews: number; uniqueViewers: number; daily: DailyPoint[] }> {
  const since = now - Math.min(Math.max(days, 1), 90) * 86400_000;
  const events = await readViews({ listingIds, since });
  const ids = listingIds.length > 0 ? listingIds : [...new Set(events.map((e) => e.listingId))];
  return {
    perListing: ids.map((id) => summarizeListing(events, id, days, now)),
    totalViews: events.length,
    uniqueViewers: new Set(events.map(identityOf)).size,
    daily: aggregateDaily(events, Math.min(Math.max(days, 1), 90), now),
  };
}

export async function getTopReferrersForListings(
  listingIds: string[],
  days = 30,
  limit = 8
): Promise<{ source: string; count: number }[]> {
  const now = Date.now();
  const events = await readViews({ listingIds, since: now - days * 86400_000 });
  return topReferrers(events, limit);
}

export async function getPlatformAnalytics(days = 30, topN = 10, now = Date.now()): Promise<PlatformAnalytics> {
  const rangeDays = Math.min(Math.max(days, 1), 90);
  const since = now - rangeDays * 86400_000;
  const events = await readViews({ since });
  const byListing = new Map<string, ViewEvent[]>();
  for (const e of events) {
    const arr = byListing.get(e.listingId) ?? [];
    arr.push(e);
    byListing.set(e.listingId, arr);
  }
  const topListings = [...byListing.entries()]
    .map(([listingId, evts]) => ({
      listingId,
      views: evts.length,
      uniques: new Set(evts.map(identityOf)).size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, topN);
  return {
    rangeDays,
    totalViews: events.length,
    uniqueViewers: new Set(events.map(identityOf)).size,
    viewedListings: byListing.size,
    daily: aggregateDaily(events, rangeDays, now),
    topListings,
    topReferrers: topReferrers(events),
  };
}

/** Single-listing public counter (social proof). Never throws — returns zeros on failure. */
export async function getListingViewCount(listingId: string): Promise<{ views: number; uniques: number }> {
  try {
    const since = Date.now() - 90 * 86400_000;
    const events = await readViews({ listingIds: [listingId], since, take: 20_000 });
    return { views: events.length, uniques: new Set(events.map(identityOf)).size };
  } catch {
    return { views: 0, uniques: 0 };
  }
}

/* ------------------------- seller / admin reports ------------------------ */

export type SellerReport = SellerAnalytics & { listingIds: string[] };

/**
 * All listing ids a seller cares about: their store listings plus
 * demo-catalogue rows with the same seller name (demo-mode bridge).
 */
export async function resolveSellerListingIds(
  userId: string,
  userName: string
): Promise<{ ids: string[]; titles: Map<string, string> }> {
  const store = getStore();
  const owned = await store.listListingsByOwner(userId).catch(() => []);
  const ids = new Set(owned.map((l) => l.id));
  const titles = new Map<string, string>(owned.map((l) => [l.id, l.title]));
  for (const l of LISTINGS) {
    if (l.sellerName === userName && !ids.has(l.id)) {
      ids.add(l.id);
      titles.set(l.id, l.title);
    }
  }
  return { ids: [...ids], titles };
}

export async function getSellerAnalyticsReport(
  user: { id: string; name: string },
  days = 30,
  maxDays = 90
): Promise<SellerReport> {
  const allowed = [7, 30, 90].filter((d) => d <= maxDays);
  const rangeDays = allowed.includes(days) ? days : Math.max(...allowed);
  const { ids: listingIds, titles } = await resolveSellerListingIds(user.id, user.name);
  const [stats, referrers] = await Promise.all([
    getListingsStats(listingIds, rangeDays),
    getTopReferrersForListings(listingIds, rangeDays),
  ]);
  const since = Date.now() - rangeDays * 86400_000;
  const store = getStore();
  const [convos, orders] = await Promise.all([
    store.listConversations({ userId: user.id, sellerName: user.name }).catch(() => [] as unknown[]),
    store.listOrders().catch(() => [] as { suborders: { seller: string }[]; items: { id?: string }[] }[]),
  ]);
  const enquiries = (convos as { lastAt?: string; createdAt: string }[]).filter((c) => {
    const t = +new Date(c.lastAt ?? c.createdAt);
    return Number.isFinite(t) && t >= since;
  }).length;
  // Attribution by owner listing ids (not display-name): order contains my listing id.
  const idSet = new Set(listingIds);
  const attributed = orders.filter((o) =>
    (o.items ?? []).some((i) => i.id && idSet.has(i.id)) ||
    o.suborders?.some((s) => s.seller === user.name)
  ).length;
  // Contact-reveal conversions (Show contact + Start chat taps) across my listings.
  let reveals = 0;
  try {
    const counts: unknown[] = await Promise.all(listingIds.slice(0, 200).map((id) => store.getSetting(`reveals:${id}`).catch(() => 0)));
    reveals = counts.reduce((s: number, n: unknown) => s + (Number(n) || 0), 0);
  } catch {}
  const perListing = stats.perListing
    .map((p) => ({ ...p, title: titles.get(p.listingId) ?? p.listingId }))
    .sort((a, b) => b.views - a.views);
  return {
    rangeDays,
    totalViews: stats.totalViews,
    uniqueViewers: stats.uniqueViewers,
    views7: perListing.reduce((s, p) => s + p.views7, 0),
    daily: stats.daily,
    perListing,
    topReferrers: referrers,
    funnel: { views: stats.totalViews, enquiries, orders: attributed, reveals, conversions: reveals + enquiries },
    listingIds,
  };
}

export type AdminReport = PlatformAnalytics & {
  topListings: { listingId: string; title?: string; sellerName?: string; type?: string; views: number; uniques: number }[];
  topSellers: { sellerName: string; views: number; listings: number }[];
  catalogueSize: number;
};

export async function getAdminAnalyticsReport(days = 30): Promise<AdminReport> {
  const rangeDays = [7, 30, 90].includes(days) ? days : 30;
  const data = await getPlatformAnalytics(rangeDays, 15);
  const store = getStore();
  const topListings = await Promise.all(
    data.topListings.map(async (t) => {
      const demo = getListing(t.listingId);
      if (demo) return { ...t, title: demo.title, sellerName: demo.sellerName, type: demo.listingType };
      const stored = await store.getListing(t.listingId).catch(() => null);
      if (stored) return { ...t, title: stored.title, sellerName: stored.sellerName, type: stored.type };
      return { ...t, title: t.listingId, sellerName: "—" };
    })
  );
  const bySeller = new Map<string, { sellerName: string; views: number; listings: number }>();
  for (const t of topListings) {
    const name = t.sellerName ?? "—";
    const cur = bySeller.get(name) ?? { sellerName: name, views: 0, listings: 0 };
    cur.views += t.views;
    cur.listings += 1;
    bySeller.set(name, cur);
  }
  return {
    ...data,
    topListings,
    topSellers: [...bySeller.values()].sort((a, b) => b.views - a.views).slice(0, 10),
    catalogueSize: LISTINGS.length,
  };
}
