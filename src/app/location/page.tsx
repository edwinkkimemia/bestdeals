import { LISTINGS } from "@/data/catalog";
import { KENYA_COUNTIES } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { StaticInfo } from "@/components/static-info";
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
  const totalTowns = KENYA_COUNTIES.reduce((s, c) => s + c.towns.length, 0);

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Locations" }]} />
      <h1 className="section-title mt-2">Shop by location</h1>
      <p className="max-w-2xl text-sm text-ink-500">
        All 47 counties with their major towns. Pick your county to see products, classifieds and services listed there — no precise location needed.
      </p>

      <StaticInfo
        className="mt-4"
        items={[
          { title: `${KENYA_COUNTIES.length} counties`, description: "Full national coverage, from Mombasa to Turkana." },
          { title: `${totalTowns}+ towns`, description: "Major towns and subcounty headquarters in every county." },
          { title: `${all.length} listings`, description: "Live catalogue spread across the country — growing daily." },
        ]}
      />

      <CountyStrip
        className="mt-5"
        counties={counties}
        title={`All counties (${counties.length})`}
        viewAllHref={null}
      />
    </div>
  );
}
