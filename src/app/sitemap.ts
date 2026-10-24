import { LISTINGS, SHOPS } from "@/data/catalog";
import { getCategories } from "@/lib/categories";
import { COUNTY_NAMES, countyMatches, countySlug } from "@/lib/kenya";
import { INFO_PAGES } from "@/content/info-pages";
import { storeRead } from "@/lib/store";
import { sellerSlug } from "@/lib/live-listings";
import { subcategorySlug } from "@/lib/category-seo";

type Entry = { url: string; lastModified: Date; changeFrequency?: string; priority?: number };

/** Rebuild hourly so newly approved listings/shops appear without a redeploy. */
export const revalidate = 3600;

const dateOf = (value: string | Date | null | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(+d) ? fallback : d;
};

export default async function sitemap(): Promise<Entry[]> {
  const base = "https://chap.co.ke";
  const now = new Date();
  // Sellers/DB rows can duplicate the static catalogue (the seed uses the same
  // ids/slugs). A URL map keeps the sitemap clean and keeps the newest date.
  const entries = new Map<string, Entry>();
  const add = (entry: Entry) => {
    const prev = entries.get(entry.url);
    if (!prev || +entry.lastModified > +prev.lastModified) entries.set(entry.url, entry);
  };

  for (const p of ["/browse", "/classifieds", "/shops", "/services", "/deals", "/location", "/blog"]) {
    add({ url: `${base}${p}`, lastModified: now, changeFrequency: "daily", priority: 0.9 });
  }
  add({ url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 });
  for (const p of ["/start-selling", "/pricing", "/help", "/sell"]) {
    add({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const slug of Object.keys(INFO_PAGES)) {
    add({ url: `${base}/${slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
  }

  // Live store listings / shops / blog (best-effort — never break sitemap on DB errors).
  const live = await storeRead(
    async (store) => ({
      listings: await store.listListingsByStatus("active").catch(() => []),
      shops: await store.listShops().catch(() => []),
      posts: await store.listBlogPosts("published").catch(() => []),
    }),
    { listings: [], shops: [], posts: [] }
  );
  // Combine static + live inventory before emitting category/county URLs so
  // thin-inventory pages (which are noindex on-page) never enter the sitemap.
  const inventory = [
    ...LISTINGS.map((l) => ({ categorySlug: l.categorySlug, subcategory: (l.subcategory ?? "").toLowerCase(), county: l.county })),
    ...live.listings.map((l) => ({ categorySlug: l.categorySlug || "", subcategory: (l.subcategory ?? "").toLowerCase(), county: l.county })),
  ];
  const categoryCount = new Map<string, number>();
  const subcategoryCount = new Map<string, number>();
  for (const l of inventory) {
    categoryCount.set(l.categorySlug, (categoryCount.get(l.categorySlug) ?? 0) + 1);
    if (l.subcategory) {
      const key = `${l.categorySlug}/${l.subcategory}`;
      subcategoryCount.set(key, (subcategoryCount.get(key) ?? 0) + 1);
    }
  }

  const categories = await getCategories();
  for (const c of categories) {
    if ((categoryCount.get(c.slug) ?? 0) === 0) continue;
    add({ url: `${base}/browse/${c.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
    for (const sub of c.subcategories) {
      if ((subcategoryCount.get(`${c.slug}/${sub.toLowerCase()}`) ?? 0) === 0) continue;
      add({
        url: `${base}/browse/${c.slug}/${subcategorySlug(sub)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  for (const county of COUNTY_NAMES) {
    if (!inventory.some((l) => countyMatches(l.county, county))) continue;
    add({
      url: `${base}/location/${countySlug(county)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  for (const l of LISTINGS) {
    const seg = l.listingType === "classified" ? "classifieds" : l.listingType === "service" ? "services" : "product";
    add({
      url: `${base}/${seg}/${l.slug}`,
      lastModified: dateOf(l.createdAt, now),
      changeFrequency: "weekly",
      priority: l.featured ? 0.8 : 0.6,
    });
  }
  for (const s of SHOPS) {
    add({ url: `${base}/shops/${s.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
  }
  for (const name of new Set(LISTINGS.map((l) => l.sellerName))) {
    add({ url: `${base}/seller/${sellerSlug(name)}`, lastModified: now, changeFrequency: "weekly", priority: 0.5 });
  }

  for (const l of live.listings.slice(0, 45_000)) {
    const seg = l.type === "classified" ? "classifieds" : l.type === "service" ? "services" : "product";
    add({
      url: `${base}/${seg}/${l.slug}`,
      lastModified: dateOf(l.createdAt, now),
      changeFrequency: "weekly",
      priority: l.featured ? 0.8 : 0.6,
    });
  }
  for (const s of live.shops.slice(0, 5_000)) {
    add({
      url: `${base}/shops/${s.slug}`,
      lastModified: dateOf(s.createdAt, now),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  for (const p of live.posts.slice(0, 1_000)) {
    add({
      url: `${base}/blog/${p.slug}`,
      lastModified: dateOf(p.updatedAt, now),
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }
  for (const name of new Set(live.listings.map((l) => l.sellerName).filter(Boolean))) {
    add({ url: `${base}/seller/${sellerSlug(name)}`, lastModified: now, changeFrequency: "weekly", priority: 0.5 });
  }

  return [...entries.values()];
}
