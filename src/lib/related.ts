import { LISTINGS, type Listing } from "@/data/catalog";

/** Canonical public URL for any listing type. */
export function listingHref(l: Pick<Listing, "listingType" | "slug">): string {
  const seg =
    l.listingType === "classified"
      ? "/classifieds/"
      : l.listingType === "service"
        ? "/services/"
        : "/product/";
  return seg + l.slug;
}

export type RelatedGroups = {
  /** Same-category + marketplace picks from OTHER sellers (classifieds & stores mixed in). */
  fromOthers: Listing[];
  /** Other listings by the same seller/shop. */
  fromSeller: Listing[];
};

function score(candidate: Listing, base: Listing): number {
  let s = 0;
  if (candidate.categorySlug === base.categorySlug) s += 3;
  if (candidate.county === base.county) s += 1;
  if (candidate.verified) s += 1;
  if (candidate.featured) s += 1;
  // Surface classifieds & store catalogue alongside shoppable products.
  if (candidate.listingType === "classified") s += 0.5;
  if (candidate.shopSlug) s += 0.5;
  // Recency tie-break (newer first).
  s += Math.max(0, 1 - (Date.now() - +new Date(candidate.createdAt)) / (30 * 864e5)) * 0.5;
  return s;
}

/**
 * Cross-seller related engine: same-category items from other sellers first
 * (classifieds and store products included), then marketplace fill so the rail
 * is never empty. Same-seller items are returned separately for a
 * "More from this seller" strip.
 */
export function getRelated(base: Listing, count = 4): RelatedGroups {
  const pool = LISTINGS.filter((l) => l.id !== base.id && l.stock > 0);
  const fromSeller = pool
    .filter((l) => l.sellerName === base.sellerName)
    .sort((a, b) => score(b, base) - score(a, base))
    .slice(0, 4);
  const sellerIds = new Set(fromSeller.map((l) => l.id));
  const fromOthers = pool
    .filter((l) => l.sellerName !== base.sellerName && !sellerIds.has(l.id))
    .sort((a, b) => score(b, base) - score(a, base))
    .slice(0, count);
  return { fromOthers, fromSeller };
}
