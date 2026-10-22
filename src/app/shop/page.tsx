import Link from "next/link";
import { Fragment } from "react";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { CategoryStrip } from "@/components/category-strip";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Shop Products",
  description: "New products from verified retailers, wholesalers and independents across Kenya — cart, cash on delivery, countrywide delivery.",
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default async function ShopIndex() {
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
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Shop" }]} />
      <h1 className="sr-only">Shop Products</h1>

      <CategoryStrip className="mt-2" title="Shop by category" viewAllHref={null} />

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
