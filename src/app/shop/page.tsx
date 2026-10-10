import Link from "next/link";
import { CATEGORIES } from "@/data/catalog";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";

export const metadata = {
  title: "Shop Products",
  description: "New products from verified retailers, wholesalers and independents across Kenya — cart, M-Pesa checkout, countrywide delivery.",
};

export default function ShopIndex() {
  const products = LISTINGS.filter((l) => l.listingType === "product");
  return (
    <div className="container-bd py-8">
      <nav className="text-xs text-ink-400"><Link href="/" className="hover:underline">Home</Link> / <span>Shop</span></nav>
      <h1 className="section-title mt-2">Shop Products</h1>
      <p className="text-sm text-ink-500">New products from retailers, wholesalers and independent merchants — with cart, M-Pesa checkout and delivery across all 47 counties.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Cart & M-Pesa checkout", d: "One cart across sellers, server-verified totals, STK push to your phone. Never share your PIN." },
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
          <Link key={c.slug} href={`/shop/${c.slug}`} className="card group p-3 hover:border-brand-600">
            <p className="text-sm font-semibold group-hover:text-brand-700">{c.name}</p>
            <p className="clamp-2 mt-0.5 text-xs text-ink-400">{c.blurb}</p>
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
