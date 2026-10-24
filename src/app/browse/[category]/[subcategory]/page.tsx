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
  categoryPath,
  priceRangeOf,
  subcategoryBySlug,
  topBrandsOf,
  topCountiesOf,
} from "@/lib/category-seo";

// Live inventory changes constantly; keep the landing page fresh.
export const dynamic = "force-dynamic";

const getSubcategoryData = cache(async (categorySlug: string, subSlug: string) => {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return null;
  const subcategory = subcategoryBySlug(category, subSlug);
  if (!subcategory) return null;
  const { items, total } = await searchAll({
    category: category.slug,
    subcategory,
    sort: "relevance",
    perPage: 48,
  });
  return { category, subcategory, items, total };
});

export async function generateMetadata({
  params,
}: {
  params: { category: string; subcategory: string };
}): Promise<Metadata> {
  const data = await getSubcategoryData(params.category, params.subcategory);
  if (!data) return { title: "Category" };
  const { category, subcategory, items, total } = data;
  const prices = priceRangeOf(items);
  const description = categoryMetaDescription(category, subcategory, total, prices).slice(0, 160);
  const title = `${subcategory} in Kenya — ${category.name}`;
  const path = categoryPath(category, subcategory);
  return {
    title,
    description,
    keywords: categoryKeywords(category, subcategory),
    alternates: { canonical: `https://chap.co.ke${path}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://chap.co.ke${path}`,
      siteName: "chap.co.ke",
      locale: "en_KE",
      images: [{ url: category.image, alt: `${subcategory} on Chap` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [category.image],
    },
    ...(total === 0 ? { robots: { index: false, follow: true } } : { robots: { index: true, follow: true } }),
  };
}

export default async function SubcategoryPage({
  params,
}: {
  params: { category: string; subcategory: string };
}) {
  const data = await getSubcategoryData(params.category, params.subcategory);
  if (!data) notFound();
  const { category, subcategory, total } = data;
  const items = shuffleFeaturedFirst(data.items);
  const counties = topCountiesOf(items);
  const prices = priceRangeOf(items);
  const brands = topBrandsOf(items);
  const faqs = categoryFaqs(category, subcategory, total, prices, counties);
  const description = categoryMetaDescription(category, subcategory, total, prices);

  return (
    <CategoryLanding
      category={category}
      subcategory={subcategory}
      total={total}
      items={items}
      counties={counties}
      prices={prices}
      brands={brands}
      intro={categoryIntro(category, subcategory, total)}
      faqs={faqs}
      jsonLd={categoryJsonLd({ category, subcategory, description, items, faqs })}
    />
  );
}
