import { LISTINGS, SHOPS } from "@/data/catalog";
import { countyMatches } from "@/lib/kenya";
import { normalizePlan, PLAN_IDS } from "@/lib/plans";
import { storeRead, type UserRecord } from "@/lib/store";
import {
  mergeShopDisplay,
  mergeStaticAndLive,
  sellerSlug,
  storeRecordToListing,
  type ShopDisplay,
} from "@/lib/live-listings";

export type EntitySearchParams = {
  q?: string;
  county?: string;
  town?: string;
};

export type SellerSearchResult = {
  key: string;
  userId?: string;
  slug: string;
  name: string;
  businessName?: string;
  sellerKind: "individual" | "business";
  verified: boolean;
  planId: string;
  photoUrl?: string | null;
  bio?: string | null;
  county?: string;
  town?: string;
  listingsCount: number;
  memberSince?: string;
  hasAccount: boolean;
};

export type ShopSearchResult = {
  slug: string;
  name: string;
  description: string;
  businessCategory: string;
  county: string;
  town: string;
  verified: boolean;
  planId: string;
  logo: string | null;
  cover: string | null;
  listingsCount: number;
  ownerId?: string;
  createdAt?: string;
};

export type EntitySearchResults = {
  sellers: SellerSearchResult[];
  shops: ShopSearchResult[];
};

type SellerAggregate = {
  key: string;
  user?: UserRecord;
  name: string;
  sellerKind: "individual" | "business";
  listingVerified: boolean;
  listingsCount: number;
  counties: Map<string, number>;
  towns: Map<string, number>;
  shopSlugs: Set<string>;
  keywords: string[];
};

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

function tokensFor(q?: string): string[] {
  return (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

function bump(map: Map<string, number>, value: string | null | undefined) {
  const key = (value ?? "").trim();
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topValue(map: Map<string, number>): string | undefined {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

function entityScore(
  name: string,
  businessName: string | undefined,
  haystack: string,
  tokens: string[],
  verified: boolean,
  planId: string,
  listingsCount: number
): number {
  const hay = haystack.toLowerCase();
  const n = norm(name);
  const b = norm(businessName);
  let score = 0;
  for (const token of tokens) {
    if (n === token || b === token) score += 50;
    else if (n.startsWith(token) || b.startsWith(token)) score += 20;
    else if (n.includes(token) || b.includes(token)) score += 10;
    else if (hay.includes(token)) score += 2;
  }
  if (verified) score += 3;
  score += PLAN_IDS.indexOf(normalizePlan(planId)) * 2;
  score += Math.min(listingsCount, 50) * 0.2;
  return score;
}

function sellerLocationMatches(
  seller: SellerAggregate,
  params: EntitySearchParams
): boolean {
  const county = params.county ?? "all";
  if (county !== "all") {
    const hasCounty = [...seller.counties.keys()].some((c) => countyMatches(c, county));
    if (!hasCounty) return false;
  }
  const town = norm(params.town);
  if (town && town !== "all") {
    const hasTown = [...seller.towns.keys()].some((t) => norm(t) === town);
    if (!hasTown) return false;
  }
  return true;
}

function sellerHaystack(seller: SellerAggregate): string {
  return [
    seller.user?.name ?? seller.name,
    seller.user?.businessName ?? "",
    seller.user?.bio ?? "",
    seller.sellerKind,
    ...seller.counties.keys(),
    ...seller.towns.keys(),
    ...seller.keywords,
  ].join(" ");
}

function toSellerResult(seller: SellerAggregate): SellerSearchResult {
  const user = seller.user;
  return {
    key: seller.key,
    userId: user?.id,
    slug: sellerSlug(user?.name ?? seller.name),
    name: user?.name ?? seller.name,
    businessName: user?.businessName,
    sellerKind: seller.sellerKind,
    verified: Boolean(user?.verified || seller.listingVerified),
    planId: normalizePlan(user?.planId),
    photoUrl: user?.photoUrl ?? null,
    bio: user?.bio ?? null,
    county: topValue(seller.counties),
    town: topValue(seller.towns),
    listingsCount: seller.listingsCount,
    memberSince: user?.createdAt,
    hasAccount: Boolean(user),
  };
}

function toShopResult(display: ShopDisplay, ownerId?: string, createdAt?: string): ShopSearchResult {
  return {
    slug: display.slug,
    name: display.name,
    description: display.description,
    businessCategory: display.businessCategory,
    county: display.county,
    town: display.town,
    verified: display.verified,
    planId: normalizePlan(display.planId),
    logo: display.logo,
    cover: display.cover,
    listingsCount: 0,
    ownerId,
    createdAt,
  };
}

/**
 * Search seller profiles and shop storefronts alongside listings.
 *
 * Sellers represented by a shop are returned in `shops` only, so a business
 * storefront never appears twice. Individual sellers without a shop (and
 * business sellers who have not opened one) appear in `sellers`.
 */
export async function searchEntities(params: EntitySearchParams): Promise<EntitySearchResults> {
  const [users, storedShops, live] = await Promise.all([
    storeRead((store) => store.listUsers(), [] as UserRecord[]),
    storeRead((store) => store.listShops(), []),
    storeRead((store) => store.listListingsByStatus("active"), []),
  ]);

  const allListings = mergeStaticAndLive(LISTINGS, live.map(storeRecordToListing));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const usersByName = new Map<string, UserRecord>();
  for (const user of users) {
    usersByName.set(norm(user.name), user);
    if (user.businessName) usersByName.set(norm(user.businessName), user);
  }

  const storedBySlug = new Map(storedShops.map((shop) => [shop.slug, shop]));
  const shops = new Map<string, ShopSearchResult>();

  for (const demo of SHOPS) {
    const twin = storedBySlug.get(demo.slug) ?? null;
    const display = mergeShopDisplay(
      {
        slug: demo.slug,
        name: demo.name,
        description: demo.description,
        businessCategory: demo.businessCategory,
        county: demo.county,
        town: demo.town,
        phone: demo.phone,
        logo: demo.logo,
        cover: demo.cover,
        verified: demo.verified,
        deliveryInfo: demo.deliveryInfo,
        hours: demo.hours,
        planId: "free",
      },
      twin
    );
    shops.set(display.slug, toShopResult(display, twin?.ownerId, twin?.createdAt));
  }

  for (const stored of storedShops) {
    if (shops.has(stored.slug)) continue;
    const display: ShopDisplay = {
      slug: stored.slug,
      name: stored.name,
      description: stored.description ?? "",
      businessCategory: stored.businessCategory ?? "",
      county: stored.county ?? "",
      town: stored.town ?? "",
      phone: stored.phone ?? "",
      logo: stored.logoUrl ?? null,
      cover: stored.coverUrl ?? null,
      verified: stored.verified ?? false,
      deliveryInfo: stored.deliveryInfo ?? "",
      hours: stored.hours ?? "",
      planId: normalizePlan(stored.planId),
    };
    shops.set(stored.slug, toShopResult(mergeShopDisplay(display, stored), stored.ownerId, stored.createdAt));
  }

  const shopKeywords = new Map<string, string[]>();
  const shopListingCounts = new Map<string, number>();
  for (const listing of allListings) {
    if (!listing.shopSlug) continue;
    shopListingCounts.set(listing.shopSlug, (shopListingCounts.get(listing.shopSlug) ?? 0) + 1);
    const keywords = shopKeywords.get(listing.shopSlug) ?? [];
    if (keywords.length < 200) {
      keywords.push(`${listing.title} ${listing.categorySlug} ${listing.subcategory ?? ""}`);
    }
    shopKeywords.set(listing.shopSlug, keywords);
  }
  for (const shop of shops.values()) {
    shop.listingsCount = shopListingCounts.get(shop.slug) ?? 0;
  }

  const sellers = new Map<string, SellerAggregate>();
  for (const listing of allListings) {
    const sellerName = (listing.sellerName ?? "").trim();
    if (!sellerName) continue;
    const user =
      (listing.ownerId ? usersById.get(listing.ownerId) : undefined) ??
      usersByName.get(norm(sellerName));
    const key = user ? `user:${user.id}` : `name:${norm(sellerName)}`;
    let seller = sellers.get(key);
    if (!seller) {
      seller = {
        key,
        user,
        name: user?.name ?? sellerName,
        sellerKind: user?.sellerKind ?? (listing.sellerType === "business" ? "business" : "individual"),
        listingVerified: false,
        listingsCount: 0,
        counties: new Map(),
        towns: new Map(),
        shopSlugs: new Set(),
        keywords: [],
      };
      sellers.set(key, seller);
    }
    seller.listingsCount += 1;
    seller.listingVerified ||= listing.verified;
    bump(seller.counties, listing.county);
    bump(seller.towns, listing.town);
    if (listing.shopSlug) seller.shopSlugs.add(listing.shopSlug);
    if (seller.keywords.length < 200) {
      seller.keywords.push(`${listing.title} ${listing.categorySlug} ${listing.subcategory ?? ""}`);
    }
  }

  const shopOwnerIds = new Set(storedShops.map((shop) => shop.ownerId).filter(Boolean));
  const shopNames = new Set([...shops.values()].map((shop) => norm(shop.name)));
  const tokens = tokensFor(params.q);

  const sellerMatches = [...sellers.values()]
    .filter((seller) => {
      // A storefront owner is already a shop result; don't duplicate them.
      if (seller.user && shopOwnerIds.has(seller.user.id)) return false;
      // Only hide the seller when the linked storefront actually exists —
      // a stale shopSlug must not make a seller disappear from search.
      if ([...seller.shopSlugs].some((slug) => shops.has(slug))) return false;
      if (shopNames.has(norm(seller.name))) return false;
      if (seller.user?.businessName && shopNames.has(norm(seller.user.businessName))) return false;
      if (!sellerLocationMatches(seller, params)) return false;
      return matchesTokens(sellerHaystack(seller), tokens);
    })
    .map((seller) => {
      const haystack = sellerHaystack(seller);
      return {
        seller: toSellerResult(seller),
        score: entityScore(
          seller.user?.name ?? seller.name,
          seller.user?.businessName,
          haystack,
          tokens,
          Boolean(seller.user?.verified || seller.listingVerified),
          normalizePlan(seller.user?.planId),
          seller.listingsCount
        ),
      };
    })
    .sort((a, b) => b.score - a.score || a.seller.name.localeCompare(b.seller.name))
    .map((entry) => entry.seller);

  const county = params.county ?? "all";
  const town = norm(params.town);
  const shopMatches = [...shops.values()]
    .filter((shop) => {
      if (county !== "all" && !countyMatches(shop.county, county)) return false;
      if (town && town !== "all" && norm(shop.town) !== town) return false;
      const owner = shop.ownerId ? usersById.get(shop.ownerId) : undefined;
      const haystack = [
        shop.name,
        shop.description,
        shop.businessCategory,
        shop.county,
        shop.town,
        owner?.name ?? "",
        owner?.businessName ?? "",
        ...(shopKeywords.get(shop.slug) ?? []),
      ].join(" ");
      return matchesTokens(haystack, tokens);
    })
    .map((shop) => {
      const owner = shop.ownerId ? usersById.get(shop.ownerId) : undefined;
      const haystack = [
        shop.name,
        shop.description,
        shop.businessCategory,
        shop.county,
        shop.town,
        owner?.name ?? "",
        owner?.businessName ?? "",
        ...(shopKeywords.get(shop.slug) ?? []),
      ].join(" ");
      return {
        shop,
        score: entityScore(
          shop.name,
          undefined,
          haystack,
          tokens,
          shop.verified,
          shop.planId,
          shop.listingsCount
        ),
      };
    })
    .sort((a, b) => b.score - a.score || a.shop.name.localeCompare(b.shop.name))
    .map((entry) => entry.shop);

  return { sellers: sellerMatches, shops: shopMatches };
}
