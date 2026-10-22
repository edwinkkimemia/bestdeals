import { LISTINGS } from "@/data/catalog";
import { KENYA_COUNTIES } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { CountyStrip } from "@/components/county-strip";

export const metadata = {
  title: "Shop by location",
  description: "Browse products, classifieds and services across all 47 Kenyan counties — pick your county and see what's listed near you.",
};

// Live counts must include seller listings — a static prerender would freeze
// counts at build time and hide every product posted afterwards.
export const dynamic = "force-dynamic";

export default async function LocationIndex() {
  const { getLiveStoreListings, mergeStaticAndLive } = await import("@/lib/live-listings");
  const { countyMatches } = await import("@/lib/kenya");
  const live = await getLiveStoreListings();
  const all = mergeStaticAndLive(LISTINGS, live);
  const counties = [...KENYA_COUNTIES]
    .map((c) => ({
      ...c,
      count: all.filter((l) => countyMatches(l.county, c.county)).length,
    }))
    .sort((a, b) => a.county.localeCompare(b.county));

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Locations" }]} />
      <h1 className="sr-only">Shop by location</h1>

      <CountyStrip
        className="mt-2"
        counties={counties}
        title={`All counties (${counties.length})`}
        viewAllHref={null}
      />
    </div>
  );
}
