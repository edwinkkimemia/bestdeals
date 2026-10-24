import Link from "next/link";
import { Fragment } from "react";
import { CATEGORIES, LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { CategoryStrip } from "@/components/category-strip";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Classifieds — New & Pre-owned in Kenya",
  description: "Buy and sell new and second-hand goods person-to-person across Kenya. Enquire, negotiate, meet safely.",
  keywords: ["Kenya classifieds", "second hand Kenya", "buy and sell Kenya", "used goods Nairobi", "chap.co.ke"],
  alternates: { canonical: "https://chap.co.ke/classifieds" },
  openGraph: {
    type: "website",
    title: "Classifieds in Kenya",
    description: "Buy and sell new and second-hand goods person-to-person across Kenya.",
    url: "https://chap.co.ke/classifieds",
    siteName: "chap.co.ke",
    locale: "en_KE",
    images: [{ url: "/chaplogo.png", width: 1147, height: 287, alt: "chap.co.ke" }],
  },
  twitter: { card: "summary_large_image", title: "Classifieds in Kenya", description: "Buy and sell new and second-hand goods across Kenya.", images: ["/chaplogo.png"] },
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default async function ClassifiedsIndex() {
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const live = (await getLiveStoreListings()).filter((l) => l.listingType === "classified");
  const items = shuffleFeaturedFirst(
    await withLiveVerification(
      mergeStaticAndLive(
        LISTINGS.filter((l) => l.listingType === "classified"),
        live
      )
    )
  );
  // Per-category counts for the compact category rail.
  const catCount = (slug: string) => items.filter((l) => l.categorySlug === slug).length;
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Classifieds" }]} />
      <h1 className="sr-only">Classifieds</h1>

      <CategoryStrip
        className="mt-2"
        title="Browse by category"
        viewAllHref="/search?type=classified"
        viewAllLabel="View all ads →"
        hrefFor={(c) => `/search?category=${c.slug}&type=classified`}
        counts={Object.fromEntries(CATEGORIES.map((c) => [c.slug, catCount(c.slug)]))}
      />

      <h2 className="mb-2 mt-5 font-bold">Latest classifieds ({items.length})</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((l, i) => (
        <Fragment key={l.id}>
          <ListingCard listing={l} />
          <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
        </Fragment>
      ))}
      </div>

      <div className="card mt-8 bg-sand-50 p-5">
        <p className="font-bold">Selling something? It takes 3 minutes</p>
        <p className="mt-1 text-sm text-ink-500">Free for individuals: daylight photos, honest condition, fair KES price, your county and town. Moderation usually clears listings within hours.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/sell?type=classified" className="btn-primary">Post a free ad</Link>
          <Link href="/sellers" className="btn-secondary">Seller guidelines</Link>
        </div>
      </div>
    </div>
  );
}
