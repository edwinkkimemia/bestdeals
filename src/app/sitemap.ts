import { CATEGORIES, LISTINGS, SHOPS } from "@/data/catalog";

export default function sitemap() {
  const base = "https://chap.co.ke";
  const now = new Date();
  const urls = [
    "",
    "/shop",
    "/classifieds",
    "/shops",
    "/services",
    "/deals",
    "/sell",
    "/start-selling",
    "/pricing",
    "/help",
  ].map((p) => ({ url: `${base}${p || "/"}`, lastModified: now }));
  for (const c of CATEGORIES) urls.push({ url: `${base}/shop/${c.slug}`, lastModified: now });
  for (const l of LISTINGS) {
    const seg = l.listingType === "classified" ? "classifieds" : l.listingType === "service" ? "services" : "product";
    urls.push({ url: `${base}/${seg}/${l.slug}`, lastModified: now });
  }
  for (const s of SHOPS) urls.push({ url: `${base}/shops/${s.slug}`, lastModified: now });
  return urls;
}
