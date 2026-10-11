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
        sameAs: [] as string[],
      },
    ],
  };
}
