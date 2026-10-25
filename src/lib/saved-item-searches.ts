/** Convert hearted products into real saved searches (one unified collection). */
import { getListing } from "@/data/catalog";
import { getStore } from "./store";
import { uid } from "./utils";

export type SavedSearchRecord = {
  id: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
  lastAlertAt?: string;
  /** Present when this saved search came from a hearted listing. */
  sourceListingId?: string;
};

const savedKey = (userId: string) => `saved_searches:${userId}`;
const wishKey = (userId: string) => `wishlist:${userId}`;

async function readSaved(userId: string): Promise<SavedSearchRecord[]> {
  const value = await getStore().getSetting(savedKey(userId)).catch(() => null);
  return Array.isArray(value) ? (value as SavedSearchRecord[]) : [];
}

async function writeSaved(userId: string, items: SavedSearchRecord[]): Promise<void> {
  await getStore().setSetting(savedKey(userId), items).catch(() => {});
}

type ItemSource = {
  title: string;
  categorySlug?: string;
  subcategory?: string;
  price: number;
};

export function itemSearchQuery(listing: ItemSource): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (listing.categorySlug) query.category = listing.categorySlug;
  if (listing.subcategory) query.subcategory = listing.subcategory;
  if (listing.price > 0) query.max = Math.ceil((listing.price * 1.25) / 1000) * 1000;
  if (!listing.categorySlug) {
    query.q = listing.title.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
  }
  return query;
}

async function resolveListing(id: string): Promise<ItemSource | null> {
  const catalogue = getListing(id);
  if (catalogue) {
    return {
      title: catalogue.title,
      categorySlug: catalogue.categorySlug,
      subcategory: catalogue.subcategory,
      price: catalogue.price,
    };
  }
  const stored = await getStore().getListing(id).catch(() => null);
  if (!stored || stored.status !== "active") return null;
  return {
    title: stored.title,
    categorySlug: stored.categorySlug,
    subcategory: stored.subcategory,
    price: stored.price,
  };
}

/** Ensure every hearted product has a matching product-based saved search. */
export async function ensureItemSearches(userId: string, listingIds: string[]): Promise<void> {
  if (!userId || listingIds.length === 0) return;
  const current = await readSaved(userId);
  const manual = current.filter((s) => !s.sourceListingId);
  const bySource = new Map(
    current.filter((s) => s.sourceListingId).map((s) => [s.sourceListingId!, s] as const)
  );

  for (const id of [...new Set(listingIds)].slice(0, 100)) {
    if (bySource.has(id)) continue;
    const listing = await resolveListing(id);
    if (!listing) continue;
    const name = `Similar to ${listing.title.slice(0, 62)}`;
    const query = itemSearchQuery(listing);
    bySource.set(id, {
      id: uid("ss"),
      name,
      query,
      createdAt: new Date().toISOString(),
      sourceListingId: id,
    });
  }

  await writeSaved(userId, [...manual, ...bySource.values()]);
}

/** Remove any product-based saved search for a listing that was un-hearted. */
export async function removeItemSearch(userId: string, listingId: string): Promise<void> {
  if (!userId || !listingId) return;
  const current = await readSaved(userId);
  await writeSaved(userId, current.filter((s) => s.sourceListingId !== listingId));
}

/** Migration/safety net: turn the current synced wishlist into saved searches. */
export async function syncWishlistSearches(userId: string): Promise<void> {
  if (!userId) return;
  const value = await getStore().getSetting(wishKey(userId)).catch(() => null);
  const ids = Array.isArray(value) ? (value as string[]) : [];
  if (ids.length > 0) await ensureItemSearches(userId, ids);
}
