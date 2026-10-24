import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { LISTINGS } from "@/data/catalog";
import { KENYA_COUNTIES, countyMatches, countySlug, resolveCountyEntry } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { CountyStrip } from "@/components/county-strip";
import { ListingRail } from "@/components/listing-rail";
import { breadcrumbJsonLd, collectionJsonLd } from "@/lib/seo";
import { listingPath } from "@/lib/category-seo";

// Live seller listings must appear instantly — a static prerender would freeze
// this page at build time and hide every product posted afterwards.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return KENYA_COUNTIES.map((c) => ({ county: countySlug(c.county) }));
}

export async function generateMetadata({ params }: { params: { county: string } }): Promise<Metadata> {
  const entry = resolveCountyEntry(params.county);
  if (!entry) return { title: "Location not found" };
  // Thin-inventory guard: empty counties stay browsable ("be the first to
  // list") but out of the index until supply arrives.
  const { getLiveStoreListings, mergeStaticAndLive } = await import("@/lib/live-listings");
  const live = await getLiveStoreListings().catch(() => []);
  const all = mergeStaticAndLive(LISTINGS, live);
  const count = all.filter((l) => countyMatches(l.county, entry.county)).length;
  const url = `https://chap.co.ke/location/${countySlug(entry.county)}`;
  const title = `${entry.county} — shop near you`;
  const description = count
    ? `Shop ${count} products, classifieds and services listed in ${entry.county} (${entry.towns
        .slice(0, 5)
        .join(", ")}). Compare prices in KES from sellers near you on Chap.`
    : `Products, classifieds and services in ${entry.county} (${entry.towns
        .slice(0, 5)
        .join(", ")}). Be the first seller to list in ${entry.county} on Chap.`;
  return {
    title,
    description,
    keywords: [
      `${entry.county} marketplace`,
      `buy in ${entry.county}`,
      `shops in ${entry.county}`,
      ...entry.towns.map((t) => `buy in ${t}`),
      "Kenya",
      "chap.co.ke",
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: "chap.co.ke",
      locale: "en_KE",
      images: [{ url: entry.image, alt: entry.county }],
    },
    twitter: { card: "summary_large_image", title, description, images: [entry.image] },
    ...(count === 0 ? { robots: { index: false, follow: true } } : { robots: { index: true, follow: true } }),
  };
}

export default async function CountyPage({ params }: { params: { county: string } }) {
  const entry = resolveCountyEntry(params.county);
  if (!entry) notFound();

  const county = entry as NonNullable<typeof entry>;
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const live = await getLiveStoreListings();
  // Stamp the merged set so static rows carry live plan/verified flags for card checkmarks.
  const all = await withLiveVerification(mergeStaticAndLive(LISTINGS, live));
  const items = all.filter((l) => countyMatches(l.county, county.county));
  const featured = items.filter((l) => l.featured);
  const products = items.filter((l) => l.listingType === "product");
  const classifieds = items.filter((l) => l.listingType === "classified");
  const countyName = county.county;
  const others = [...KENYA_COUNTIES]
    .filter((c) => c.county !== countyName)
    .map((c) => ({ ...c, count: all.filter((l) => countyMatches(l.county, c.county)).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const url = `https://chap.co.ke/location/${countySlug(county.county)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      collectionJsonLd({
        name: `Shop in ${county.county}`,
        description: `Products, classifieds and services listed in ${county.county}, Kenya.`,
        url,
        items: items.slice(0, 48).map((l) => ({ name: l.title, url: listingPath(l) })),
      }),
      breadcrumbJsonLd([
        { name: "Home", url: "https://chap.co.ke/" },
        { name: "Locations", url: "https://chap.co.ke/location" },
        { name: county.county, url },
      ]),
    ],
  };

  return (
    <div className="container-bd py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
          <ListingRail
            id="c-featured"
            title="Featured listings"
            subtitle={`Featured picks from sellers in ${county.county}.`}
            items={featured}
            moreHref={`/search?county=${encodeURIComponent(county.county)}`}
          />
          <ListingRail
            id="c-products"
            title="Shop listings"
            subtitle={`Buy online from sellers in ${county.county}.`}
            items={products}
            moreHref={`/search?county=${encodeURIComponent(county.county)}&type=product`}
          />
          <ListingRail
            id="c-classifieds"
            title="Classifieds"
            subtitle={`New & pre-owned from individual sellers in ${county.county}.`}
            items={classifieds}
            moreHref={`/search?county=${encodeURIComponent(county.county)}&type=classified`}
          />
          {featured.length + products.length + classifieds.length === 0 && (
            <div className="mt-4">
              <Link href={`/search?county=${encodeURIComponent(county.county)}`} className="btn-primary">
                Browse all {items.length} listings in {county.county} →
              </Link>
            </div>
          )}
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
      <CountyStrip
        className="mt-10"
        counties={others}
        title="More counties"
        viewAllHref="/location"
        viewAllLabel="All 47 →"
      />
    </div>
  );
}
