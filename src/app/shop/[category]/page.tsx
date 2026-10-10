import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORIES, categoryBySlug } from "@/data/catalog";
import { searchListings } from "@/lib/search";
import { ListingCard } from "@/components/ui/listing-card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const c = categoryBySlug(params.category);
  if (!c) return { title: "Category" };
  return {
    title: `${c.name} for sale in Kenya`,
    description: `${c.blurb}. Compare prices from trusted sellers across Kenya.`,
    alternates: { canonical: `https://chap.co.ke/shop/${c.slug}` },
  };
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const c = categoryBySlug(params.category);
  if (!c) notFound();
  const { items, total } = searchListings({ category: c.slug, sort: "relevance", perPage: 48 });
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { href: "/shop", label: "Shop" }, { label: c.name }]} />
      <h1 className="section-title mt-2">{c.name} ({total})</h1>
      <p className="text-sm text-ink-500">{c.blurb}</p>
      {c.subcategories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.subcategories.map((s) => (
            <Link key={s} href={`/search?category=${c.slug}&q=${encodeURIComponent(s)}`} className="chip hover:border-brand-600">{s}</Link>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-bold">No listings in this category yet</p>
          <p className="text-sm text-ink-500">Be the first to <Link href="/dashboard/listings/new" className="link-bd">list an item here</Link>.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
