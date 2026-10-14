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

function subOf(l: Pick<Listing, "subcategory">): string {
  return (l.subcategory ?? "").trim().toLowerCase();
}

function score(candidate: Listing, base: Listing): number {
  let s = 0;
  if (candidate.categorySlug === base.categorySlug) s += 3;
  const baseSub = subOf(base);
  if (baseSub && subOf(candidate) === baseSub) s += 2;
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
 * Relatedness tier: same subcategory (0) beats same category (1) beats the
 * rest of the marketplace (2). The strip used to be pure score order, so a
 * phone page could suggest sofas — now same-category picks always lead.
 */
export function relatedTier(candidate: Pick<Listing, "categorySlug" | "subcategory">, base: Pick<Listing, "categorySlug" | "subcategory">): number {
  if (candidate.categorySlug !== base.categorySlug) return 2;
  const baseSub = subOf(base);
  if (baseSub && subOf(candidate) === baseSub) return 0;
  return 1;
}

/**
 * Cross-seller related engine: same-category items from other sellers first
 * (classifieds and store products included), then marketplace fill so the rail
 * is never empty. Same-seller items are returned separately for a
 * "More from this seller" strip.
 */
/**
 * Same-seller match that survives renames and static/store splits: stable
 * owner id first, then shop, then the legacy display-name equality.
 */
export function sameSeller(a: Pick<Listing, "ownerId" | "shopSlug" | "sellerName">, b: Pick<Listing, "ownerId" | "shopSlug" | "sellerName">): boolean {
  if (a.ownerId && b.ownerId && a.ownerId === b.ownerId) return true;
  if (a.shopSlug && b.shopSlug && a.shopSlug === b.shopSlug) return true;
  return a.sellerName === b.sellerName;
}

export function getRelated(base: Listing, count = 6, catalogue: Listing[] = LISTINGS): RelatedGroups {
  // Callers pass static + live merged: a newly registered shop's products
  // only exist in the store, so a static-only pool hides its "More from"
  // strip entirely while demo shops show one.
  const pool = catalogue.filter((l) => l.id !== base.id && l.stock > 0);
  // Same-seller strip fills two 6-col rows (was hard-capped at 4 while
  // sellers like FonZone hold 18) — the section links to the full catalogue.
  const fromSeller = pool
    .filter((l) => sameSeller(l, base))
    .sort((a, b) => score(b, base) - score(a, base))
    .slice(0, 12);
  const sellerIds = new Set(fromSeller.map((l) => l.id));
  const fromOthers = pool
    .filter((l) => !sameSeller(l, base) && !sellerIds.has(l.id))
    .sort((a, b) => relatedTier(a, base) - relatedTier(b, base) || score(b, base) - score(a, base))
    .slice(0, count);
  return { fromOthers, fromSeller };
}
