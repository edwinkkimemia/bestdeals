import Link from "next/link";
import { CATEGORIES } from "@/data/catalog";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { CategoryIcon } from "@/components/category-icon";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Shop Products",
  description: "New products from verified retailers, wholesalers and independents across Kenya — cart, cash on delivery, countrywide delivery.",
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default function ShopIndex() {
  const products = shuffleFeaturedFirst(LISTINGS.filter((l) => l.listingType === "product"));
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Shop" }]} />
      <h1 className="section-title mt-2">Shop Products</h1>
      <p className="text-sm text-ink-500">New products from retailers, wholesalers and independent merchants — with cart, cash on delivery and delivery across all 47 counties.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Cart & cash on delivery", d: "One cart across sellers, server-verified totals, pay the courier in cash on arrival. Never pay in advance." },
          { t: "Multi-seller, zero confusion", d: "Mixed carts split into per-seller suborders — each seller packs and ships their part, tracked in one place." },
          { t: "Compare and save", d: "Every product page shows the same item from other sellers and classifieds, with genuine savings badges." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-bold">Shop by category</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/shop/${c.slug}`} className="card group overflow-hidden hover:border-brand-600">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" loading="lazy" className="h-20 w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-brand-700 shadow">
                <CategoryIcon name={c.icon} className="h-4 w-4" />
              </span>
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold leading-tight group-hover:text-brand-700">{c.name}</p>
              <p className="clamp-2 mt-0.5 text-xs text-ink-400">{c.blurb}</p>
              {c.subcategories.length > 0 && (
                <p className="mt-1.5 flex flex-wrap gap-1">
                  {c.subcategories.slice(0, 4).map((s) => (
                    <Link key={s} href={`/search?category=${c.slug}&subcategory=${encodeURIComponent(s)}`} className="rounded-full bg-sand-50 px-2 py-0.5 text-[11px] font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700">{s}</Link>
                  ))}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-2 mt-8 flex items-end justify-between">
        <h2 className="font-bold">All shoppable products ({products.length})</h2>
        <Link href="/search?type=product&sort=newest" className="link-bd text-sm">Newest first →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {products.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </div>
  );
}
