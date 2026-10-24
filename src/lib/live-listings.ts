/**
 * Live (seller-posted) listings bridge.
 *
 * Static `LISTINGS` in `src/data/catalog.ts` power the demo rails, but
 * seller listings live in the store (DemoStore in-memory or Prisma/Postgres)
 * with status `pending → active → ...`. Before this module, browse pages
 * (`/browse`, `/search`, `/product/[slug]`, `/shops/[slug]`, …) only read the
 * static catalogue, so an admin-approved product never appeared anywhere
 * public — the exact "added product does not show live" report.
 *
 * This module maps `ListingRecord` → catalogue `Listing` so existing UI
 * (`ListingCard`, `ListingDetail`, search ranking) works unchanged, and
 * provides small async helpers pages can call with `storeRead` safety.
 */
import type { Listing } from "@/data/catalog";
import { storeRead, type ListingRecord } from "./store";
import { normalizePlan, PLAN_IDS } from "./plans";

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
    categorySlug: s.categorySlug || "",
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
    ownerId: s.ownerId,
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
  return withLiveVerification(live.map(storeRecordToListing));
}

/** Active listings for one shop (used by `/shops/[slug]` community branch). */
export async function getLiveShopListings(
  shopSlug: string
): Promise<Listing[]> {
  const items = await storeRead(
    (st) => st.listListingsByShop(shopSlug),
    []
  );
  return withLiveVerification(
    items
      .filter((l) => l.status === "active")
      .map(storeRecordToListing)
  );
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

/**
 * Seller avatar for detail pages. Looks up by stable owner id first (the
 * sellerName snapshot goes stale when sellers rename), then falls back to
 * the legacy display-name match.
 */
export async function resolveSellerPhoto(l: Pick<Listing, "ownerId" | "sellerName">): Promise<string | null> {
  if (l.ownerId) {
    const byId = await storeRead((st) => st.findUserById(l.ownerId as string).then((u) => u?.photoUrl ?? null), null);
    if (byId) return byId;
  }
  return storeRead(
    (st) => st.findUserByDisplayName(l.sellerName).then((u) => u?.photoUrl ?? null),
    null
  );
}

export type ShopInfo = {
  slug: string;
  name: string;
  logoUrl: string | null;
  verified: boolean;
  businessCategory: string;
  town: string;
  county: string;
  /** Store-twin phone (admin/seller editable) — catalogue copy goes stale. */
  phone?: string | null;
  /** Normalized shop plan (free | silver | gold) — drives the plan checkmark. */
  planId?: string | null;
};

/** Display fields shared by the static catalogue and store shop rows. */
export type ShopDisplay = {
  slug: string;
  name: string;
  description: string;
  businessCategory: string;
  county: string;
  town: string;
  phone: string;
  logo: string | null;
  cover: string | null;
  verified: boolean;
  deliveryInfo: string;
  hours: string;
  /** Normalized plan id (free | silver | gold) — drives the plan checkmark. */
  planId: string;
};

export type ShopTwin = {
  name?: string | null;
  description?: string | null;
  businessCategory?: string | null;
  county?: string | null;
  town?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  verified?: boolean;
  deliveryInfo?: string | null;
  hours?: string | null;
  planId?: string | null;
};

/**
 * Store twin wins over the hardcoded catalogue: admin verification plus
 * seller header edits (logo/cover/name/…) live in the store, while the
 * catalogue copy is frozen at seed time. Without this, demo shops (e.g.
 * Rift Hardware) show "Verification pending" publicly after being verified
 * in admin — the exact mismatch reported. Blank store fields fall back to
 * catalogue values; logo/cover trust the twin once it exists.
 */
export function mergeShopDisplay(demo: ShopDisplay, stored: ShopTwin | null): ShopDisplay {
  if (!stored) return demo;
  const text = (v: string | null | undefined, fb: string) => (v ?? "").trim() || fb;
  return {
    ...demo,
    name: text(stored.name, demo.name),
    description: text(stored.description, demo.description),
    businessCategory: text(stored.businessCategory, demo.businessCategory),
    county: text(stored.county, demo.county),
    town: text(stored.town, demo.town),
    phone: text(stored.phone, demo.phone),
    // Art falls back to the catalogue (seeded twins always carry it; legacy
    // NULL rows predate the columns). An explicit logo removal on a demo shop
    // re-shows the catalogue art — accepted over dropping art entirely.
    logo: stored.logoUrl ?? demo.logo,
    cover: stored.coverUrl ?? demo.cover,
    verified: stored.verified ?? demo.verified,
    deliveryInfo: text(stored.deliveryInfo, demo.deliveryInfo),
    hours: text(stored.hours, demo.hours),
    planId: normalizePlan(stored.planId ?? demo.planId),
  };
}

/**
 * Shop identity for product pages: the store twin (admin verification +
 * seller header edits) wins, the static catalogue is the fallback. Lets
 * shop listings show the shop (logo, name, business badge) instead of the
 * owner's personal profile.
 */
export async function resolveShopInfo(shopSlug?: string): Promise<ShopInfo | null> {
  if (!shopSlug) return null;
  const stored = await storeRead((st) => st.getShopBySlug(shopSlug), null);
  const { getShop } = await import("@/data/catalog");
  const demo = getShop(shopSlug);
  if (stored) {
    const base: ShopDisplay = demo
      ? {
          slug: demo.slug, name: demo.name, description: demo.description,
          businessCategory: demo.businessCategory, county: demo.county, town: demo.town,
          phone: demo.phone, logo: demo.logo, cover: demo.cover, verified: demo.verified,
          deliveryInfo: demo.deliveryInfo, hours: demo.hours, planId: "free",
        }
      : {
          slug: stored.slug, name: stored.name, description: stored.description ?? "",
          businessCategory: stored.businessCategory ?? "", county: stored.county ?? "",
          town: stored.town ?? "", phone: stored.phone ?? "", logo: null, cover: null,
          verified: stored.verified ?? false, deliveryInfo: "", hours: "", planId: "free",
        };
    const v = mergeShopDisplay(base, stored);
    return {
      slug: v.slug,
      name: v.name,
      logoUrl: v.logo,
      verified: v.verified,
      businessCategory: v.businessCategory,
      town: v.town,
      county: v.county,
      phone: v.phone,
      planId: v.planId,
    };
  }
  if (!demo) return null;
  return {
    slug: demo.slug,
    name: demo.name,
    logoUrl: demo.logo,
    verified: demo.verified,
    businessCategory: demo.businessCategory,
    town: demo.town,
    county: demo.county,
    phone: demo.phone,
    planId: "free",
  };
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

/**
 * Single source of truth for the ✓ badge + plan checkmark: the LIVE records
 * win over hardcoded catalogue flags. Demo listings ship with `verified:
 * false` in `catalog.ts`, but once the seller verifies (admin approval),
 * every badge — detail pages, cards, rails — must flip without editing the
 * catalogue. Same for plans: the seller's one effective plan (shop plan for
 * storefront owners, personal plan otherwise) stamps `planId` so grid cards
 * can render the blue/gold check without per-row queries.
 * One `listUsers` + one `listShops` call per invocation; safe fallback keeps
 * the static flags with a null plan.
 */
export async function withLiveVerification<T extends Pick<Listing, "ownerId" | "sellerName" | "verified">>(
  items: T[]
): Promise<(T & { planId: string | null; sellerSince: string | null })[]> {
  if (items.length === 0) return [];
  const [users, shops] = await Promise.all([
    storeRead(
      (st) => st.listUsers(),
      []
    ).catch(() => []),
    storeRead(
      (st) => st.listShops(),
      []
    ).catch(() => []),
  ]);
  const rank = (p: string | null) => PLAN_IDS.indexOf(normalizePlan(p ?? "free"));
  const byId = new Map(users.map((u) => [u.id, u]));
  const byName = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    byName.set(u.name.trim().toLowerCase(), u);
    if (u.businessName) byName.set(u.businessName.trim().toLowerCase(), u);
  }
  // One plan per seller: the first owned shop wins; personal plans only apply
  // when the seller has no storefront.
  const shopPlanByOwner = new Map<string, string>();
  const planByShopSlug = new Map<string, string>();
  for (const s of shops) {
    const pid = normalizePlan((s as { planId?: unknown }).planId);
    planByShopSlug.set(s.slug, pid);
    const owner = (s as { ownerId?: string }).ownerId;
    if (owner && !shopPlanByOwner.has(owner)) {
      shopPlanByOwner.set(owner, pid);
    }
  }
  const effective = (user: (typeof users)[number] | undefined, ownerId?: string, shopSlug?: string): { verified: boolean | undefined; plan: string | null; since: string | null } => {
    let verified: boolean | undefined;
    let plan: string | null = null;
    let since: string | null = null;
    if (user) {
      verified = user.verified;
      since = (user as { createdAt?: string }).createdAt ?? null;
    }
    const ownedShopPlan = ownerId ? shopPlanByOwner.get(ownerId) : undefined;
    if (shopSlug) plan = planByShopSlug.get(shopSlug) ?? null;
    if (!plan && ownedShopPlan) plan = ownedShopPlan;
    if (!plan && !ownedShopPlan && user) plan = normalizePlan(user.planId);
    return { verified, plan: rank(plan) > 0 ? plan : null, since };
  };
  return items.map((l) => {
    const shopSlug = (l as { shopSlug?: string }).shopSlug;
    const basePlan = (l as { planId?: string | null }).planId ?? null;
    const baseSince = (l as { sellerSince?: string | null }).sellerSince ?? null;
    if (l.ownerId && byId.has(l.ownerId)) {
      const e = effective(byId.get(l.ownerId), l.ownerId, shopSlug);
      return { ...l, verified: e.verified ?? l.verified, planId: e.plan ?? basePlan, sellerSince: e.since ?? baseSince };
    }
    const hit = byName.get(l.sellerName.trim().toLowerCase());
    if (hit !== undefined) {
      const e = effective(hit, undefined, shopSlug);
      return { ...l, verified: e.verified ?? l.verified, planId: e.plan ?? basePlan, sellerSince: e.since ?? baseSince };
    }
    if (shopSlug && planByShopSlug.has(shopSlug)) {
      const sp = planByShopSlug.get(shopSlug)!;
      return { ...l, planId: rank(sp) > rank(basePlan) ? sp : basePlan, sellerSince: baseSince };
    }
    return { ...l, planId: basePlan, sellerSince: baseSince };
  });
}

/**
 * Detail-page bundle: cross-seller rails + live ✓ flags in one `listUsers`
 * call. Returns the main listing plus its rails with badges resolved.
 */
export async function relatedWithLive(
  main: Listing
): Promise<{ main: Listing; fromOthers: Listing[]; fromSeller: Listing[] }> {
  const { LISTINGS } = await import("@/data/catalog");
  // Static + live merged: seller-posted products only exist in the store.
  const live = await getLiveStoreListings().catch(() => []);
  const pool = mergeStaticAndLive(LISTINGS, live);
  const { getRelated } = await import("./related");
  const { fromOthers, fromSeller } = getRelated(main, 6, pool);
  const all = await withLiveVerification([main, ...fromOthers, ...fromSeller]);
  return {
    main: all[0],
    fromOthers: all.slice(1, 1 + fromOthers.length),
    fromSeller: all.slice(1 + fromOthers.length),
  };
}

/** URL slug for a seller display name (`FonZone Nairobi` → `fonzone-nairobi`). */
export function sellerSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "seller"
  );
}

export type SellerProfileView = {
  key: string;
  userId?: string;
  name: string;
  businessName?: string;
  photoUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  verified: boolean;
  sellerKind: string;
  memberSince?: string;
  hasAccount: boolean;
};

/**
 * Public seller profile lookup for `/seller/[slug]`: stable user id first,
 * then account display/business name, then catalogue fallback (sellers with
 * listings but no registered account yet). Never exposes phone/email.
 */
export async function resolveSellerProfile(slug: string): Promise<SellerProfileView | null> {
  const needle = decodeURIComponent(slug).trim().toLowerCase();
  if (!needle) return null;
  const byId = await storeRead(
    (st) => st.findUserById(decodeURIComponent(slug).trim()).catch(() => null),
    null
  );
  if (byId) {
    return {
      key: byId.id,
      userId: byId.id,
      name: byId.name,
      businessName: byId.businessName,
      photoUrl: byId.photoUrl ?? null,
      coverUrl: byId.coverUrl ?? null,
      bio: byId.bio ?? null,
      verified: byId.verified,
      sellerKind: byId.sellerKind,
      memberSince: byId.createdAt,
      hasAccount: true,
    };
  }
  const users = await storeRead(
    (st) => st.listUsers().catch(() => []),
    []
  ).catch(() => []);
  const hit = users.find(
    (u) => sellerSlug(u.name) === needle || (u.businessName && sellerSlug(u.businessName) === needle)
  );
  if (hit) {
    return {
      key: hit.id,
      userId: hit.id,
      name: hit.name,
      businessName: hit.businessName,
      photoUrl: hit.photoUrl ?? null,
      coverUrl: hit.coverUrl ?? null,
      bio: hit.bio ?? null,
      verified: hit.verified,
      sellerKind: hit.sellerKind,
      memberSince: hit.createdAt,
      hasAccount: true,
    };
  }
  const { LISTINGS } = await import("@/data/catalog");
  const names = [...new Set(LISTINGS.map((l) => l.sellerName))];
  const name = names.find((n) => sellerSlug(n) === needle);
  if (!name) return null;
  const items = LISTINGS.filter((l) => l.sellerName === name);
  return {
    key: sellerSlug(name),
    name,
    photoUrl: null,
    coverUrl: null,
    bio: null,
    verified: items.some((l) => l.verified),
    sellerKind: items[0]?.sellerType ?? "individual",
    hasAccount: false,
  };
}

/** Public listings for a seller profile: live store items + catalogue, badges resolved. */
export async function getSellerListings(
  profile: Pick<SellerProfileView, "userId" | "name" | "businessName">
): Promise<Listing[]> {
  const names = new Set(
    [profile.name, profile.businessName].filter(Boolean).map((n) => (n as string).toLowerCase())
  );
  const live = await storeRead(
    (st) => st.listListingsByStatus("active"),
    []
  ).catch(() => []);
  const mine = live.filter(
    (l) =>
      (profile.userId && l.ownerId === profile.userId) ||
      names.has((l.sellerName || "").toLowerCase())
  );
  const { LISTINGS } = await import("@/data/catalog");
  const staticOnes = LISTINGS.filter((l) => names.has(l.sellerName.toLowerCase()));
  return withLiveVerification(mergeStaticAndLive(staticOnes, mine.map(storeRecordToListing)));
}

export type SellerContact = { phone: string; whatsapp: string };

/**
 * Public contact for Call/WhatsApp buttons: first owned shop's approved
 * number, else the verified phone snapshot from their listings (already
 * public on every listing). Null when no public number exists.
 */
export function resolveSellerContact(
  listings: Pick<Listing, "sellerPhone">[],
  shops: { phone?: string }[]
): SellerContact | null {
  const raw = shops.find((s) => s.phone)?.phone ?? listings.map((l) => l.sellerPhone).find(Boolean);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return { phone: raw, whatsapp: digits.startsWith("0") ? `254${digits.slice(1)}` : digits };
}
