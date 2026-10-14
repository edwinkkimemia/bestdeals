import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { LISTINGS } from "@/data/catalog";
import { KENYA_COUNTIES, countyMatches } from "@/lib/kenya";
import { ListingCard } from "@/components/ui/listing-card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

// Live seller listings must appear instantly — a static prerender would freeze
// this page at build time and hide every product posted afterwards.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return KENYA_COUNTIES.map((c) => ({ county: c.county }));
}

export async function generateMetadata({ params }: { params: { county: string } }): Promise<Metadata> {
  const entry = KENYA_COUNTIES.find((c) => c.county.toLowerCase() === decodeURIComponent(params.county).toLowerCase());
  if (!entry) return { title: "Location not found" };
  // Thin-inventory guard: empty counties stay browsable ("be the first to
  // list") but out of the index until supply arrives.
  const { countyMatches } = await import("@/lib/kenya");
  const { getLiveStoreListings, mergeStaticAndLive } = await import("@/lib/live-listings");
  const live = await getLiveStoreListings().catch(() => []);
  const all = mergeStaticAndLive(LISTINGS, live);
  const count = all.filter((l) => countyMatches(l.county, entry.county)).length;
  return {
    title: `${entry.county} — shop near you`,
    description: `Products, classifieds and services listed in ${entry.county} (${entry.towns.slice(0, 5).join(", ")}). Browse what's near you on Chap.`,
    ...(count === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CountyPage({ params }: { params: { county: string } }) {
  const entry = KENYA_COUNTIES.find((c) => c.county.toLowerCase() === decodeURIComponent(params.county).toLowerCase());
  if (!entry) notFound();

  const county = entry as NonNullable<typeof entry>;
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const live = await getLiveStoreListings();
  // Stamp the merged set so static rows carry live plan/verified flags for card checkmarks.
  const all = await withLiveVerification(mergeStaticAndLive(LISTINGS, live));
  const items = all.filter((l) => countyMatches(l.county, county.county));
  const products = items.filter((l) => l.listingType === "product");
  const classifieds = items.filter((l) => l.listingType === "classified");
  const services = items.filter((l) => l.listingType === "service");
  const countyName = county.county;
  const others = [...KENYA_COUNTIES]
    .filter((c) => c.county !== countyName)
    .map((c) => ({ ...c, count: all.filter((l) => countyMatches(l.county, c.county)).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const rail = (id: string, title: string, sub: string, list: typeof items, moreHref: string) =>
    list.length > 0 ? (
      <section className="mt-10" aria-labelledby={id}>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id={id} className="section-title">{title} ({list.length})</h2>
            <p className="text-sm text-ink-500">{sub}</p>
          </div>
          <Link href={moreHref} className="link-bd">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {list.slice(0, 12).map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>
    ) : null;

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { href: "/location", label: "Locations" }, { label: county.county }]} />

      {/* county hero */}
      <div className="card relative mt-2 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={county.image} alt={county.county} className="h-44 w-full object-cover sm:h-56" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 p-5 text-white">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide opacity-90"><MapPin className="h-3.5 w-3.5" /> {county.county} County</p>
          <h1 className="section-title !text-white">Shop in {county.county} ({items.length})</h1>
          <p className="mt-1 max-w-2xl text-sm opacity-90">
            {county.towns.map((t, i) => (
              <span key={t}>
                {i > 0 && " · "}
                <Link href={`/search?county=${encodeURIComponent(county.county)}&town=${encodeURIComponent(t)}`} className="underline decoration-white/50 underline-offset-2 hover:decoration-white">{t}</Link>
              </span>
            ))}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-lg font-bold">Nothing listed in {county.county} yet</p>
          <p className="mt-1 text-sm text-ink-500">Be the first — post a listing and it will show up here instantly.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/sell" className="btn-primary">Sell in {county.county}</Link>
            <Link href="/search" className="btn-secondary">Browse all Kenya</Link>
          </div>
        </div>
      ) : (
        <>
          {rail("c-products", "Shop products", `Buy online from sellers in ${county.county}.`, products, `/search?county=${encodeURIComponent(county.county)}&type=product`)}
          {rail("c-classifieds", "Classifieds", `New & pre-owned from individual sellers in ${county.county}.`, classifieds, `/search?county=${encodeURIComponent(county.county)}&type=classified`)}
          {rail("c-services", "Services", `Fundis and pros covering ${county.county}.`, services, `/search?county=${encodeURIComponent(county.county)}&type=service`)}
        </>
      )}

      {/* towns */}
      <section className="mt-10" aria-label="Towns">
        <h2 className="font-bold">Towns in {county.county}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {county.towns.map((t) => (
            <Link key={t} href={`/search?county=${encodeURIComponent(county.county)}&town=${encodeURIComponent(t)}`} className="chip hover:border-brand-600 hover:text-brand-700">
              {t}
            </Link>
          ))}
        </div>
      </section>

      {/* other counties */}
      <section className="mt-10" aria-label="Other counties">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="section-title">More counties</h2>
          <Link href="/location" className="link-bd">All 47 →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {others.map((c) => (
            <Link key={c.county} href={`/location/${encodeURIComponent(c.county)}`} className="card group overflow-hidden transition hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.county} loading="lazy" className="h-20 w-full object-cover transition duration-300 group-hover:scale-105" />
              <div className="p-2.5">
                <p className="truncate text-sm font-bold group-hover:text-brand-700">{c.county}</p>
                <p className="text-xs text-ink-500">{c.count > 0 ? `${c.count} listings` : "Explore →"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
