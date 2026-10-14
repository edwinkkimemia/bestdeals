import Link from "next/link";
import { MapPin } from "lucide-react";
import { LISTINGS } from "@/data/catalog";
import { KENYA_COUNTIES } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

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

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: `${KENYA_COUNTIES.length} counties`, d: "Full national coverage, from Mombasa to Turkana." },
          { t: `${totalTowns}+ towns`, d: "Major towns and subcounty headquarters in every county." },
          { t: `${all.length} listings`, d: "Live catalogue spread across the country — growing daily." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-bold">All counties ({counties.length})</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {counties.map((c) => (
          <Link key={c.county} href={`/location/${encodeURIComponent(c.county)}`} className="card group overflow-hidden transition hover:shadow-lg">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.county} loading="lazy" className="h-28 w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-xl bg-white/95 px-2.5 py-1 text-xs font-bold text-brand-700 shadow">
                <MapPin className="h-3.5 w-3.5" /> {c.count > 0 ? `${c.count} listing${c.count === 1 ? "" : "s"}` : "Explore"}
              </span>
            </div>
            <div className="p-4">
              <p className="text-base font-bold leading-tight group-hover:text-brand-700">{c.county}</p>
              <p className="clamp-2 mt-1 text-sm text-ink-500">
                {c.towns.slice(0, 4).join(" · ")}{c.towns.length > 4 ? ` · +${c.towns.length - 4} more` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
