import type { Category, Listing } from "@/data/catalog";
import { categoryBySlug } from "@/data/catalog";
import { formatKES } from "./format";
import { slugify } from "./utils";
import { breadcrumbJsonLd, collectionJsonLd, faqJsonLd, productJsonLd, serviceJsonLd } from "./seo";

/** URL slug for a category's subcategory (e.g. "Smart TVs" → "smart-tvs"). */
export function subcategorySlug(name: string): string {
  return slugify(name);
}

export function subcategoryBySlug(category: Category, slug: string): string | undefined {
  const wanted = slug.toLowerCase();
  return category.subcategories.find((s) => subcategorySlug(s) === wanted);
}

export function categoryPath(category: Category, subcategory?: string): string {
  return `/browse/${category.slug}${subcategory ? `/${subcategorySlug(subcategory)}` : ""}`;
}

export function categoryLabel(category: Category, subcategory?: string): string {
  return subcategory ?? category.name;
}

/** Keyword set for category/subcategory metadata. Natural phrases, no stuffing. */
export function categoryKeywords(category: Category, subcategory?: string): string[] {
  const label = categoryLabel(category, subcategory);
  const counties = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];
  return [
    label,
    `${label} Kenya`,
    `buy ${label} in Kenya`,
    `${label} price in Kenya`,
    `${label} for sale`,
    ...counties.map((c) => `${label} ${c}`),
    ...category.subcategories.filter((s) => s !== subcategory).slice(0, 8).map((s) => `${s} Kenya`),
    `${category.name} Kenya`,
    "chap.co.ke",
  ];
}

export type CategoryPriceRange = { min: number; max: number; count: number } | null;

export function priceRangeOf(items: Listing[]): CategoryPriceRange {
  const prices = items.map((l) => l.price).filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices), count: prices.length };
}

export function topCountiesOf(items: Listing[], limit = 8): { county: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of items) if (l.county) counts.set(l.county, (counts.get(l.county) ?? 0) + 1);
  return [...counts.entries()]
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count || a.county.localeCompare(b.county))
    .slice(0, limit);
}

export function topBrandsOf(items: Listing[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const l of items) {
    const brand = String(l.attributes?.brand ?? "").trim();
    if (brand) counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([brand]) => brand);
}

export function categoryMetaDescription(
  category: Category,
  subcategory: string | undefined,
  total: number,
  prices: CategoryPriceRange
): string {
  const label = categoryLabel(category, subcategory);
  const priceText = prices ? ` Prices from ${formatKES(prices.min)} to ${formatKES(prices.max)}.` : "";
  return `Compare ${total > 0 ? `${total} ` : ""}${label.toLowerCase()} listings from sellers across Kenya.${priceText} Buy online or contact the seller on Chap.`;
}

export function categoryFaqs(
  category: Category,
  subcategory: string | undefined,
  total: number,
  prices: CategoryPriceRange,
  counties: { county: string; count: number }[]
): { q: string; a: string }[] {
  const label = categoryLabel(category, subcategory);
  const lower = label.toLowerCase();
  const places = counties.slice(0, 3).map((c) => c.county);
  return [
    {
      q: `How much do ${lower} cost in Kenya?`,
      a: prices
        ? `Live ${lower} listings on Chap currently range from ${formatKES(prices.min)} to ${formatKES(prices.max)}, across ${prices.count} priced listings. Condition, brand, warranty and seller location all affect the final price.`
        : `Prices for ${lower} vary by brand, condition and seller. Browse the live listings above and compare seller prices before you buy.`,
    },
    {
      q: `Where can I buy ${lower} near me?`,
      a:
        places.length > 0
          ? `You can buy ${lower} from sellers in ${places.join(", ")}, and get delivery countrywide. Use the location pages or the seller's shop page to confirm pickup and delivery options.`
          : `Chap lists ${lower} from sellers across Kenya. Open a listing to see the seller's town, delivery information and contact options.`,
    },
    {
      q: `Are ${lower} sellers on Chap verified?`,
      a: `Many sellers complete ID or business verification and show a green ✓ badge. Check the badge, shop reviews and listing details, and never pay before confirming the item and seller.`,
    },
    {
      q: `Can I sell my ${lower} on Chap?`,
      a: `Yes. Post your ${lower} for free, choose a category and location, and add clear photos and a fair price. Listings go live after a quick moderation review.`,
    },
    ...(total > 0
      ? [
          {
            q: `How many ${lower} listings are on Chap right now?`,
            a: `There are ${total} live ${lower} listings in this category. New listings are added daily, and the page is updated as sellers post and moderators approve items.`,
          },
        ]
      : []),
  ];
}

export function categoryIntro(category: Category, subcategory: string | undefined, total: number): string {
  const label = categoryLabel(category, subcategory);
  return `Shop ${label.toLowerCase()} on Chap, Kenya's marketplace for products, classifieds and services. Compare ${total > 0 ? `${total} live ` : ""}listings from trusted sellers, check prices in Kenyan shillings, and buy online or contact the seller directly. ${category.blurb}.`;
}

export function listingPath(l: Pick<Listing, "listingType" | "slug">): string {
  return l.listingType === "classified"
    ? `/classifieds/${l.slug}`
    : l.listingType === "service"
      ? `/services/${l.slug}`
      : `/product/${l.slug}`;
}

export function sellerPath(l: Pick<Listing, "shopSlug" | "sellerName">): string {
  return l.shopSlug ? `/shops/${l.shopSlug}` : `/seller/${slugify(l.sellerName)}`;
}

/** Schema breadcrumb trail for a listing: Home → section → category → listing. */
export function listingBreadcrumbs(l: Listing, section: { name: string; url: string }): { name: string; url: string }[] {
  const category = categoryBySlug(l.categorySlug);
  return [
    { name: "Home", url: "/" },
    section,
    ...(category ? [{ name: category.name, url: categoryPath(category) }] : []),
    {
      name: l.subcategory ?? l.title,
      url: l.subcategory && category ? categoryPath(category, l.subcategory) : listingPath(l),
    },
    ...(l.subcategory ? [{ name: l.title, url: listingPath(l) }] : []),
  ];
}

/** Keyword set for a product/classified/service page. */
export function listingKeywords(l: Listing): string[] {
  const category = categoryBySlug(l.categorySlug);
  const brand = String(l.attributes?.brand ?? "").trim();
  return [
    l.title,
    l.subcategory ?? "",
    category?.name ?? "",
    `${l.title} price`,
    `${l.subcategory ?? category?.name ?? "item"} Kenya`,
    brand,
    l.county,
    l.town,
    "chap.co.ke",
  ].filter(Boolean);
}

/** Product schema for a shop listing (priced items only). */
export function productSchema(l: Listing): Record<string, unknown> {
  const category = categoryBySlug(l.categorySlug);
  return productJsonLd({
    name: l.title,
    description: l.description,
    image: l.images,
    price: l.price,
    url: listingPath(l),
    sku: l.id,
    brand: String(l.attributes?.brand ?? "").trim() || undefined,
    category: category ? `${category.name}${l.subcategory ? ` > ${l.subcategory}` : ""}` : undefined,
    condition: l.condition,
    stock: l.stock,
    sellerName: l.sellerName,
    sellerUrl: sellerPath(l),
  });
}

/** Service schema for service listings. */
export function serviceSchema(l: Listing): Record<string, unknown> {
  return serviceJsonLd({
    name: l.title,
    description: l.description,
    url: listingPath(l),
    image: l.images,
    price: l.price,
    area: `${l.town}, ${l.county}`,
    providerName: l.sellerName,
    providerUrl: sellerPath(l),
  });
}

/** Structured data for a category/subcategory landing page. */
export function categoryJsonLd(input: {
  category: Category;
  subcategory?: string;
  description: string;
  items: Listing[];
  faqs: { q: string; a: string }[];
}): Record<string, unknown> {
  const label = categoryLabel(input.category, input.subcategory);
  return {
    "@context": "https://schema.org",
    "@graph": [
      collectionJsonLd({
        name: `${label} in Kenya`,
        description: input.description,
        url: categoryPath(input.category, input.subcategory),
        items: input.items.slice(0, 48).map((l) => ({ name: l.title, url: listingPath(l) })),
      }),
      breadcrumbJsonLd([
        { name: "Home", url: "/" },
        { name: "Browse", url: "/browse" },
        ...(input.subcategory
          ? [{ name: input.category.name, url: categoryPath(input.category) }]
          : []),
        { name: label, url: categoryPath(input.category, input.subcategory) },
      ]),
      ...(input.faqs.length > 0 ? [faqJsonLd(input.faqs)] : []),
    ],
  };
}

