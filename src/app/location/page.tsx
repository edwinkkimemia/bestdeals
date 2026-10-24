import { LISTINGS } from "@/data/catalog";
import { KENYA_COUNTIES } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { CountyStrip } from "@/components/county-strip";
import { ListingRail } from "@/components/listing-rail";

export const metadata = {
  title: "Shop by location",
  description: "Browse products, classifieds and services across all 47 Kenyan counties — pick your county and see what's listed near you.",
  keywords: ["shop by county Kenya", "buy near me Kenya", "Nairobi marketplace", "Mombasa shops", "Kenya counties", "chap.co.ke"],
  alternates: { canonical: "https://chap.co.ke/location" },
  openGraph: {
    type: "website",
    title: "Shop by location in Kenya",
    description: "Browse products, classifieds and services across all 47 Kenyan counties.",
    url: "https://chap.co.ke/location",
    siteName: "chap.co.ke",
    locale: "en_KE",
    images: [{ url: "/chaplogo.png", width: 1147, height: 287, alt: "chap.co.ke" }],
  },
  twitter: { card: "summary_large_image", title: "Shop by location in Kenya", description: "Browse products and services across all 47 counties.", images: ["/chaplogo.png"] },
};

// Live counts must include seller listings — a static prerender would freeze
// counts at build time and hide every product posted afterwards.
export const dynamic = "force-dynamic";

export default async function LocationIndex() {
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const { countyMatches } = await import("@/lib/kenya");
  const live = await getLiveStoreListings();
  const all = await withLiveVerification(mergeStaticAndLive(LISTINGS, live));
  const counties = [...KENYA_COUNTIES]
    .map((c) => ({
      ...c,
      count: all.filter((l) => countyMatches(l.county, c.county)).length,
    }))
    .sort((a, b) => a.county.localeCompare(b.county));
  const featured = all.filter((l) => l.featured);
  const products = all.filter((l) => l.listingType === "product");
  const classifieds = all.filter((l) => l.listingType === "classified");

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Locations" }]} />
      <h1 className="section-title mt-2">Shop by location in Kenya</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-500">
        Pick your county to see products, classifieds and services listed near you. All 47 counties
        are covered, from Nairobi and Mombasa to Kisumu, Nakuru and beyond.
      </p>

      <CountyStrip
        className="mt-4"
        counties={counties}
        title={`All counties (${counties.length})`}
        viewAllHref={null}
      />

      <ListingRail
        id="loc-featured"
        title="Featured listings"
        subtitle="Promoted picks from sellers across Kenya."
        items={featured}
        moreHref="/search"
      />
      <ListingRail
        id="loc-products"
        title="Shop listings"
        subtitle="Buy online from sellers across Kenya."
        items={products}
        moreHref="/search?type=product"
      />
      <ListingRail
        id="loc-classifieds"
        title="Classifieds"
        subtitle="New & pre-owned from individual sellers across Kenya."
        items={classifieds}
        moreHref="/search?type=classified"
      />
    </div>
  );
}
