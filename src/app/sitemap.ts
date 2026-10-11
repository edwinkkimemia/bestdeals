import { CATEGORIES, LISTINGS, SHOPS } from "@/data/catalog";
import { COUNTY_NAMES } from "@/lib/kenya";
import { INFO_PAGES } from "@/content/info-pages";

type Entry = { url: string; lastModified: Date; changeFrequency?: string; priority?: number };

export default function sitemap(): Entry[] {
  const base = "https://chap.co.ke";
  const now = new Date();
  const urls: Entry[] = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...["/shop", "/classifieds", "/shops", "/services", "/deals"].map((p) => ({
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
    urls.push({ url: `${base}/shop/${c.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
    for (const s of c.subcategories) {
      urls.push({
        url: `${base}/search?category=${c.slug}&subcategory=${encodeURIComponent(s)}`,
        lastModified: now, changeFrequency: "daily", priority: 0.7,
      });
    }
  }
  for (const county of COUNTY_NAMES) {
    urls.push({
      url: `${base}/search?county=${encodeURIComponent(county)}`,
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
  return urls;
}
