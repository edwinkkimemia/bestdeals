const SITE = "https://chap.co.ke";

/** Absolute URL for schema.org fields (relative uploads are common). */
export function absoluteUrl(pathOrUrl: string): string {
  const v = String(pathOrUrl ?? "").trim();
  if (!v) return SITE;
  if (/^https?:\/\//i.test(v)) return v;
  return `${SITE}${v.startsWith("/") ? "" : "/"}${v}`;
}

const CONDITION_SCHEMA: Record<string, string> = {
  new: "NewCondition",
  like_new: "UsedCondition",
  used_good: "UsedCondition",
  used_fair: "UsedCondition",
  refurbished: "RefurbishedCondition",
};

export function productJsonLd(input: {
  name: string;
  description: string;
  image: string[];
  price: number;
  currency?: string;
  availability?: string;
  url: string;
  sku?: string;
  brand?: string;
  category?: string;
  condition?: string;
  sellerName?: string;
  sellerUrl?: string;
  stock?: number;
}): Record<string, unknown> {
  const url = absoluteUrl(input.url);
  const images = input.image.filter(Boolean).map(absoluteUrl);
  const availability =
    input.availability ?? (input.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description.slice(0, 500),
    image: images,
    url,
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.condition && CONDITION_SCHEMA[input.condition]
      ? { itemCondition: `https://schema.org/${CONDITION_SCHEMA[input.condition]}` }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: input.currency ?? "KES",
      price: input.price,
      availability,
      url,
      ...(input.sellerName
        ? {
            seller: {
              "@type": "Organization",
              name: input.sellerName,
              ...(input.sellerUrl ? { url: absoluteUrl(input.sellerUrl) } : {}),
            },
          }
        : {}),
    },
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image?: string[];
  price?: number;
  area?: string;
  providerName?: string;
  providerUrl?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.url);
  const images = (input.image ?? []).filter(Boolean).map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description.slice(0, 500),
    url,
    ...(images.length > 0 ? { image: images } : {}),
    areaServed: input.area?.trim() || "Kenya",
    ...(input.price && input.price > 0
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "KES",
            price: input.price,
            url,
            ...(input.providerName
              ? {
                  seller: {
                    "@type": "Organization",
                    name: input.providerName,
                    ...(input.providerUrl ? { url: absoluteUrl(input.providerUrl) } : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(input.providerName
      ? {
          provider: {
            "@type": "LocalBusiness",
            name: input.providerName,
            ...(input.providerUrl ? { url: absoluteUrl(input.providerUrl) } : {}),
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  };
}

/** Collection/category landing page + ordered product list (SEO + AI discovery). */
export function collectionJsonLd(input: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description.slice(0, 500),
    url: absoluteUrl(input.url),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: absoluteUrl(it.url),
      })),
    },
  };
}

export function localBusinessJsonLd(input: {
  name: string;
  description: string;
  url: string;
  phone?: string;
  area?: string;
  image?: string;
  logo?: string;
  email?: string;
  website?: string;
  town?: string;
  county?: string;
  hours?: string;
  sameAs?: string[];
}): Record<string, unknown> {
  const url = absoluteUrl(input.url);
  const sameAs = [input.website, ...(input.sameAs ?? [])].filter(Boolean).map((u) => absoluteUrl(String(u)));
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${url}#store`,
    name: input.name,
    description: input.description.slice(0, 500),
    url,
    ...(input.phone ? { telephone: input.phone } : {}),
    areaServed: input.area?.trim() || "Kenya",
    priceRange: "KES",
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    ...(input.logo ? { logo: absoluteUrl(input.logo) } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.town || input.county
      ? {
          address: {
            "@type": "PostalAddress",
            ...(input.town ? { addressLocality: input.town } : {}),
            ...(input.county ? { addressRegion: input.county } : {}),
            addressCountry: "KE",
          },
        }
      : {}),
    ...(input.hours ? { openingHours: input.hours } : {}),
    ...(sameAs.length > 0 ? { sameAs: [...new Set(sameAs)] } : {}),
  };
}

export function profileJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image?: string;
  kind?: "Person" | "Organization";
  area?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.url);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: {
      "@type": input.kind ?? "Person",
      name: input.name,
      description: input.description.slice(0, 500),
      url,
      ...(input.image ? { image: absoluteUrl(input.image) } : {}),
      ...(input.area ? { areaServed: input.area } : {}),
    },
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(input.url);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title.slice(0, 110),
    description: input.description.slice(0, 300),
    url,
    mainEntityOfPage: url,
    ...(input.image ? { image: absoluteUrl(input.image) } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.authorName
      ? { author: { "@type": "Person", name: input.authorName } }
      : { author: { "@type": "Organization", name: "chap.co.ke" } }),
    publisher: {
      "@type": "Organization",
      name: "chap.co.ke",
      url: "https://chap.co.ke/",
      logo: { "@type": "ImageObject", url: "https://chap.co.ke/chaplogo.png" },
    },
    inLanguage: "en-KE",
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Site identity + sitelinks searchbox (drives the Google search box + brand panel). */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "chap.co.ke",
        alternateName: "Chap",
        url: "https://chap.co.ke/",
        inLanguage: "en-KE",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://chap.co.ke/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "chap.co.ke",
        url: "https://chap.co.ke/",
        logo: "https://chap.co.ke/chaplogo.png",
        areaServed: "Kenya",
        email: "support@chap.co.ke",
        sameAs: [
          "https://x.com/chap_co_ke",
          "https://www.facebook.com/chap.co.ke",
          "https://www.instagram.com/chap.co.ke",
        ],
      },
    ],
  };
}
