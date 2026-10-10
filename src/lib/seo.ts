export function productJsonLd(input: {
  name: string;
  description: string;
  image: string[];
  price: number;
  currency?: string;
  availability?: string;
  url: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description.slice(0, 500),
    image: input.image,
    url: input.url,
    offers: {
      "@type": "Offer",
      priceCurrency: input.currency ?? "KES",
      price: input.price,
      availability: input.availability ?? "https://schema.org/InStock",
    },
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
      item: it.url,
    })),
  };
}

export function localBusinessJsonLd(input: {
  name: string;
  description: string;
  url: string;
  phone?: string;
  area?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: input.name,
    description: input.description.slice(0, 500),
    url: input.url,
    telephone: input.phone,
    areaServed: input.area ?? "Kenya",
    priceRange: "KES",
  };
}
