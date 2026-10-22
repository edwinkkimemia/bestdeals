import Link from "next/link";
import { Fragment } from "react";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { CategoryStrip } from "@/components/category-strip";
import { StaticInfo } from "@/components/static-info";
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
      <h1 className="section-title mt-2">Shop Products</h1>
      <p className="text-sm text-ink-500">New products from retailers, wholesalers and independent merchants — with cart, cash on delivery and delivery across all 47 counties.</p>

      <StaticInfo
        className="mt-4"
        items={[
          { title: "Cart & cash on delivery", description: "One cart across sellers; pay the courier on arrival." },
          { title: "Multi-seller carts", description: "Mixed orders split into per-seller suborders, tracked in one place." },
          { title: "Compare and save", description: "See the same item from other sellers and classifieds side by side." },
        ]}
      />

      <CategoryStrip className="mt-5" title="Shop by category" viewAllHref={null} />

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
