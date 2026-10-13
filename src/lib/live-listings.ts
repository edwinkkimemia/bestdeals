/**
 * Live (seller-posted) listings bridge.
 *
 * Static `LISTINGS` in `src/data/catalog.ts` power the demo rails, but
 * seller listings live in the store (DemoStore in-memory or Prisma/Postgres)
 * with status `pending → active → ...`. Before this module, browse pages
 * (`/shop`, `/search`, `/product/[slug]`, `/shops/[slug]`, …) only read the
 * static catalogue, so an admin-approved product never appeared anywhere
 * public — the exact "added product does not show live" report.
 *
 * This module maps `ListingRecord` → catalogue `Listing` so existing UI
 * (`ListingCard`, `ListingDetail`, search ranking) works unchanged, and
 * provides small async helpers pages can call with `storeRead` safety.
 */
import type { Listing } from "@/data/catalog";
import { storeRead, type ListingRecord } from "./store";

type ListingType = Listing["listingType"];

/** Map a store record to the catalogue shape used by all listing UI. */
export function storeRecordToListing(s: ListingRecord): Listing {
  const listingType = (["product", "classified", "service"] as const).includes(
    s.type as ListingType
  )
    ? (s.type as ListingType)
    : "product";
  const condition = (
    ["new", "like_new", "used_good", "used_fair", "refurbished"] as const
  ).includes(s.condition as Listing["condition"])
    ? (s.condition as Listing["condition"])
    : "used_good";
  const transactionMethod = (
    ["buy_online", "contact_seller", "request_quote", "enquiry"] as const
  ).includes(s.txMethod as Listing["transactionMethod"])
    ? (s.txMethod as Listing["transactionMethod"])
    : "buy_online";
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    categorySlug: s.categorySlug || "other",
    subcategory: s.subcategory,
    price: s.price,
    compareAt: s.compareAt ?? null,
    condition,
    listingType,
    transactionMethod,
    county: s.county,
    town: s.town,
    negotiable: s.negotiable,
    stock: s.stock,
    images:
      s.images && s.images.length > 0 ? s.images : ["/chaplogo.png"],
    sellerName: s.sellerName || "Seller",
    // Store listings are individual accounts unless they belong to a shop.
    sellerType: s.shopSlug ? "business" : "individual",
    sellerPhone: s.sellerPhone,
    shopSlug: s.shopSlug,
    verified: s.verified ?? true,
    featured: s.featured ?? false,
    createdAt: s.createdAt,
    attributes: s.attributes || {},
  };
}

/** All admin-approved (`active`) seller listings, mapped for public UI. */
export async function getLiveStoreListings(): Promise<Listing[]> {
  const live = await storeRead(
    (st) => st.listListingsByStatus("active"),
    []
  );
  return live.map(storeRecordToListing);
}

/** Active listings for one shop (used by `/shops/[slug]` community branch). */
export async function getLiveShopListings(
  shopSlug: string
): Promise<Listing[]> {
  const items = await storeRead(
    (st) => st.listListingsByShop(shopSlug),
    []
  );
  return items
    .filter((l) => l.status === "active")
    .map(storeRecordToListing);
}

/**
 * Public lookup by slug (or id) for detail pages.
 * Store `getListing` is id-keyed, so we scan the active set — fine at this
 * scale (capped at 200 by the store) and safe on DB errors (null fallback).
 */
export async function getLiveListingBySlug(
  slugOrId: string
): Promise<Listing | null> {
  const needle = decodeURIComponent(slugOrId).trim().toLowerCase();
  if (!needle) return null;
  // Fast path: exact id hit (covers dashboard-style ids too).
  const direct = await storeRead(
    (st) => st.getListing(slugOrId),
    null
  );
  if (direct && direct.status === "active") return storeRecordToListing(direct);
  const live = await storeRead(
    (st) => st.listListingsByStatus("active"),
    []
  );
  const hit =
    live.find(
      (l) =>
        l.slug.toLowerCase() === needle || l.id.toLowerCase() === needle
    ) ?? null;
  return hit ? storeRecordToListing(hit) : null;
}

export type PreviewListing = {
  listing: Listing;
  status: string;
  ownerId?: string;
  shopSlug?: string;
  id: string;
  slug: string;
};

const PREVIEW_STATUSES = [
  "pending",
  "active",
  "rejected",
  "hidden",
  "sold",
  "draft",
  "expired",
] as const;

/**
 * Any-status lookup for admin/owner preview (pending/rejected/hidden…).
 * Returns the mapped listing plus its moderation status and ownership so
 * pages can auth-gate the preview. Public callers must still check
 * `canPreviewListing` — never render non-active to strangers.
 */
export async function getPreviewListingBySlug(
  slugOrId: string
): Promise<PreviewListing | null> {
  const needle = decodeURIComponent(slugOrId).trim().toLowerCase();
  if (!needle) return null;
  // Fast path: direct id hit (any status).
  const direct = await storeRead(
    (st) => st.getListing(slugOrId),
    null
  );
  if (direct) {
    return {
      listing: storeRecordToListing(direct),
      status: direct.status,
      ownerId: direct.ownerId,
      shopSlug: direct.shopSlug,
      id: direct.id,
      slug: direct.slug,
    };
  }
  const settled = await Promise.all(
    PREVIEW_STATUSES.map((status) =>
      storeRead((st) => st.listListingsByStatus(status), []).catch(
        () => [] as ListingRecord[]
      )
    )
  );
  const seen = new Set<string>();
  for (const batch of settled) {
    for (const r of batch) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (
        r.slug.toLowerCase() === needle ||
        r.id.toLowerCase() === needle
      ) {
        return {
          listing: storeRecordToListing(r),
          status: r.status,
          ownerId: r.ownerId,
          shopSlug: r.shopSlug,
          id: r.id,
          slug: r.slug,
        };
      }
    }
  }
  return null;
}

/**
 * Who may see a non-live preview? Admins, the owner, or staff of the
 * listing's shop. Active listings are public (returns true without a user).
 */
export async function canPreviewListing(
  user: { id: string; role: string } | null,
  preview: Pick<PreviewListing, "status" | "ownerId" | "shopSlug">
): Promise<boolean> {
  if (preview.status === "active") return true;
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (preview.ownerId && preview.ownerId === user.id) return true;
  if (preview.shopSlug) {
    const members = await storeRead(
      (st) => st.listShopMembers(preview.shopSlug as string),
      []
    ).catch(() => []);
    if (members.some((m) => m.userId === user.id)) return true;
  }
  return false;
}

/** Canonical public path for a listing (used for share/copy links). */
export function publicListingPath(l: Pick<Listing, "listingType" | "slug">): string {
  const seg =
    l.listingType === "classified"
      ? "/classifieds/"
      : l.listingType === "service"
        ? "/services/"
        : "/product/";
  return seg + l.slug;
}

/**
 * Resolve a store listing for a detail page: active listings are public,
 * non-active ones only for admins / owners / shop staff (preview banner).
 * Returns null when nothing is visible to the current viewer. Static
 * catalogue hits must be checked by the caller first.
 */
export async function resolveStoreDetail(
  slugOrId: string
): Promise<{ listing: Listing; previewStatus: string | null } | null> {
  const live = await getLiveListingBySlug(slugOrId);
  if (live) return { listing: live, previewStatus: null };
  const preview = await getPreviewListingBySlug(slugOrId);
  if (!preview) return null;
  const { currentUser } = await import("./auth");
  const user = await currentUser().catch(() => null);
  if (!(await canPreviewListing(user, preview))) return null;
  return { listing: preview.listing, previewStatus: preview.status };
}

/** Merge static + live without duplicates (live wins on id clash). */
export function mergeStaticAndLive(
  staticItems: Listing[],
  live: Listing[]
): Listing[] {
  if (live.length === 0) return staticItems;
  const seen = new Set(staticItems.map((l) => l.id));
  const slugSeen = new Set(staticItems.map((l) => l.slug));
  const extra = live.filter((l) => !seen.has(l.id) && !slugSeen.has(l.slug));
  return [...staticItems, ...extra];
}
