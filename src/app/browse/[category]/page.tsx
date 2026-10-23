import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORIES, categoryBySlug } from "@/data/catalog";
import { searchAll, shuffleFeaturedFirst } from "@/lib/search";
import { ListingCard } from "@/components/ui/listing-card";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const c = categoryBySlug(params.category);
  if (!c) return { title: "Category" };
  // Thin-inventory guard: empty categories stay browsable for users but out
  // of the index until sellers fill them (approval-quality signal).
  const { LISTINGS } = await import("@/data/catalog");
  const { getLiveStoreListings } = await import("@/lib/live-listings");
  const live = await getLiveStoreListings().catch(() => []);
  const count =
    LISTINGS.filter((l) => l.categorySlug === c.slug).length +
    live.filter((l) => l.categorySlug === c.slug).length;
  return {
    title: `${c.name} for sale in Kenya`,
    description: `${c.blurb}. Compare prices from trusted sellers across Kenya.`,
    alternates: { canonical: `https://chap.co.ke/browse/${c.slug}` },
    ...(count === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const c = categoryBySlug(params.category);
  if (!c) notFound();
  const cat = c as NonNullable<typeof c>;
  const { items: found, total } = await searchAll({ category: cat.slug, sort: "relevance", perPage: 48 });
  const items = shuffleFeaturedFirst(found);
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { href: "/browse", label: "Browse" }, { label: cat.name }]} />
      <h1 className="section-title mt-2">{cat.name} ({total})</h1>
      <p className="text-sm text-ink-500">{cat.blurb}</p>
      {cat.subcategories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {cat.subcategories.map((s) => (
            <Link key={s} href={`/search?category=${cat.slug}&subcategory=${encodeURIComponent(s)}`} className="chip hover:border-brand-600">{s}</Link>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-bold">No listings in this category yet</p>
          <p className="text-sm text-ink-500">Be the first to <Link href="/sell" className="link-bd">list an item here</Link>.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((l, i) => (
          <Fragment key={l.id}>
            <ListingCard listing={l} />
            <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
          </Fragment>
        ))}
        </div>
      )}
    </div>
  );
}
