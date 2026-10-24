import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/categories";
import { searchAll, shuffleFeaturedFirst } from "@/lib/search";
import { CategoryLanding } from "@/components/category-landing";
import {
  categoryFaqs,
  categoryIntro,
  categoryJsonLd,
  categoryKeywords,
  categoryMetaDescription,
  priceRangeOf,
  topBrandsOf,
  topCountiesOf,
} from "@/lib/category-seo";

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

/** One data fetch per request shared by generateMetadata + the page render. */
const getCategoryData = cache(async (slug: string) => {
  const category = await getCategoryBySlug(slug);
  if (!category) return null;
  const { items, total } = await searchAll({
    category: category.slug,
    sort: "relevance",
    perPage: 48,
  });
  return { category, items, total };
});

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const data = await getCategoryData(params.category);
  if (!data) return { title: "Category" };
  const { category, items, total } = data;
  const prices = priceRangeOf(items);
  const description = categoryMetaDescription(category, undefined, total, prices).slice(0, 160);
  const title = `${category.name} in Kenya — prices, sellers & deals`;
  const url = `https://chap.co.ke/browse/${category.slug}`;
  return {
    title,
    description,
    keywords: categoryKeywords(category),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: "chap.co.ke",
      locale: "en_KE",
      images: [{ url: category.image, alt: `${category.name} on Chap` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [category.image],
    },
    // Thin-inventory guard: empty categories stay browsable but out of the index.
    ...(total === 0 ? { robots: { index: false, follow: true } } : { robots: { index: true, follow: true } }),
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const data = await getCategoryData(params.category);
  if (!data) notFound();
  const { category, total } = data;
  const items = shuffleFeaturedFirst(data.items);
  const counties = topCountiesOf(items);
  const prices = priceRangeOf(items);
  const brands = topBrandsOf(items);
  const faqs = categoryFaqs(category, undefined, total, prices, counties);
  const description = categoryMetaDescription(category, undefined, total, prices);

  return (
    <CategoryLanding
      category={category}
      total={total}
      items={items}
      counties={counties}
      prices={prices}
      brands={brands}
      intro={categoryIntro(category, undefined, total)}
      faqs={faqs}
      jsonLd={categoryJsonLd({ category, description, items, faqs })}
    />
  );
}
