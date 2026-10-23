import { CATEGORIES, LISTINGS, SHOPS } from "@/data/catalog";
import { COUNTY_NAMES } from "@/lib/kenya";
import { INFO_PAGES } from "@/content/info-pages";
import { storeRead } from "@/lib/store";

type Entry = { url: string; lastModified: Date; changeFrequency?: string; priority?: number };

export default async function sitemap(): Promise<Entry[]> {
  const base = "https://chap.co.ke";
  const now = new Date();
  const urls: Entry[] = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...["/browse", "/classifieds", "/shops", "/services", "/deals"].map((p) => ({
      url: `${base}${p}`, lastModified: now, changeFrequency: "daily", priority: 0.9,
    })),
    ...["/start-selling", "/pricing", "/help", "/sell"].map((p) => ({
      url: `${base}${p}`, lastModified: now, changeFrequency: "weekly", priority: 0.6,
    })),
    ...Object.keys(INFO_PAGES).map((slug) => ({
      url: `${base}/${slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.5,
    })),
  ];
  for (const c of CATEGORIES) {
    urls.push({ url: `${base}/browse/${c.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
  }
  for (const county of COUNTY_NAMES) {
    urls.push({
      url: `${base}/location/${encodeURIComponent(county.toLowerCase().replace(/\s+/g, "-"))}`,
      lastModified: now, changeFrequency: "daily", priority: 0.7,
    });
  }
  for (const l of LISTINGS) {
    const seg = l.listingType === "classified" ? "classifieds" : l.listingType === "service" ? "services" : "product";
    urls.push({ url: `${base}/${seg}/${l.slug}`, lastModified: now, changeFrequency: "weekly", priority: l.featured ? 0.9 : 0.6 });
  }
  for (const s of SHOPS) {
    urls.push({ url: `${base}/shops/${s.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
  }
  // Live store listings / shops / blog (best-effort — never break sitemap on DB errors).
  const live = await storeRead(async (store) => ({
    listings: await store.listListingsByStatus("active").catch(() => []),
    shops: await store.listShops().catch(() => []),
    posts: await store.listBlogPosts("published").catch(() => []),
  }), { listings: [], shops: [], posts: [] });
  for (const l of live.listings.slice(0, 5000)) {
    const seg = l.type === "classified" ? "classifieds" : l.type === "service" ? "services" : "product";
    urls.push({ url: `${base}/${seg}/${l.slug}`, lastModified: new Date(l.createdAt), changeFrequency: "weekly", priority: l.featured ? 0.9 : 0.6 });
  }
  for (const s of live.shops.slice(0, 2000)) {
    urls.push({ url: `${base}/shops/${s.slug}`, lastModified: new Date(s.createdAt), changeFrequency: "weekly", priority: 0.7 });
  }
  for (const p of live.posts.slice(0, 500)) {
    urls.push({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "weekly", priority: 0.5 });
  }
  return urls;
}
