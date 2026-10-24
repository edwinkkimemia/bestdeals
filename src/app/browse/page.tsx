import Link from "next/link";
import { Fragment } from "react";
import { LISTINGS } from "@/data/catalog";
import { getCategories } from "@/lib/categories";
import { ListingCard } from "@/components/ui/listing-card";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { CategoryStrip } from "@/components/category-strip";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Browse Products",
  description: "Browse new products from verified retailers, wholesalers and independents across Kenya — cart, cash on delivery, countrywide delivery.",
  keywords: ["browse products Kenya", "online shop Kenya", "buy products Nairobi", "verified sellers Kenya", "chap.co.ke"],
  alternates: { canonical: "https://chap.co.ke/browse" },
  openGraph: {
    type: "website",
    title: "Browse Products on Chap",
    description: "Shop new products from verified retailers, wholesalers and independents across Kenya.",
    url: "https://chap.co.ke/browse",
    siteName: "chap.co.ke",
    locale: "en_KE",
    images: [{ url: "/chaplogo.png", width: 1147, height: 287, alt: "chap.co.ke" }],
  },
  twitter: { card: "summary_large_image", title: "Browse Products on Chap", description: "Shop new products from verified sellers across Kenya.", images: ["/chaplogo.png"] },
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default async function BrowseIndex() {
  const categories = await getCategories();
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const live = (await getLiveStoreListings()).filter((l) => l.listingType === "product");
  const products = shuffleFeaturedFirst(
    await withLiveVerification(
      mergeStaticAndLive(
        LISTINGS.filter((l) => l.listingType === "product"),
        live
      )
    )
  );
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Browse" }]} />
      <h1 className="section-title mt-2">Browse products in Kenya</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-500">
        Shop new products from verified retailers, wholesalers and independent sellers across Kenya.
        Compare prices in KES, check delivery options and buy online or contact the seller.
      </p>

      <CategoryStrip categories={categories} className="mt-4" title="Browse by category" viewAllHref={null} />

      <div className="mb-2 mt-6 flex items-end justify-between">
        <h2 className="font-bold">All shoppable products ({products.length})</h2>
        <Link href="/search?type=product&sort=newest" className="link-bd text-sm">Newest first →</Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((l, i) => (
        <Fragment key={l.id}>
          <ListingCard listing={l} />
          <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
        </Fragment>
      ))}
      </div>
    </div>
  );
}
