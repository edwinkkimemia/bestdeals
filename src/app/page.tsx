import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, MapPin, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { CATEGORIES, LISTINGS, SHOPS, POPULAR_SEARCHES, shopListings } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { ListingCard } from "@/components/ui/listing-card";
import { HeroCategories } from "@/components/hero-categories";
import { COUNTY_NAMES, KENYA_COUNTIES } from "@/lib/kenya";
import { shuffleFeaturedFirst } from "@/lib/search";
import { ratingLabel } from "@/lib/ratings";

export const metadata: Metadata = {
  title: "chap.co.ke — Kenya's Marketplace for Everything",
  description: "Discover great deals, shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.",
};

// Fresh rails on every visit: shuffle runs per request (below), featured/promoted always lead.
export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {};

const SHOP_COVER_FALLBACKS = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
  "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80",
  "https://images.unsplash.com/photo-1533228100845-08145b01de14?w=800&q=80",
];

type ShopRailCard = {
  slug: string;
  name: string;
  description: string;
  cover: string;
  verified: boolean;
  place: string;
  countLabel: string;
  rating: string;
  featuredCount: number;
  featured?: boolean;
};

export default async function HomePage() {
  const { getLiveStoreListings, mergeStaticAndLive } = await import("@/lib/live-listings");
  const liveAll = await getLiveStoreListings();
  const all = mergeStaticAndLive(LISTINGS, liveAll);
  const deals = shuffleFeaturedFirst(all.filter((l) => l.compareAt && l.compareAt > l.price)).slice(0, 4);
  const featured = shuffleFeaturedFirst(all.filter((l) => l.featured)).slice(0, 8);
  const fresh = shuffleFeaturedFirst([...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 24)).slice(0, 8);
  const freshClassifieds = shuffleFeaturedFirst(all.filter((l) => l.listingType === "classified")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 12)).slice(0, 4);
  const fromShops = shuffleFeaturedFirst(all.filter((l) => l.shopSlug)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 12)).slice(0, 4);
  const countiesByListings = [...KENYA_COUNTIES]
    .map((c) => ({
      ...c,
      count: all.filter((l) => l.county.trim().toLowerCase() === c.county.toLowerCase()).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  // Trusted shops rail: catalogue shops + seller-created community shops.
  // Shops holding featured products lead; the rest shuffle fresh every visit.
  const communityShops = await storeRead((s) => s.listShops(), []);
  const shopCards: ShopRailCard[] = [
    ...SHOPS.map((s) => {
      const items = shopListings(s.slug);
      const featuredCount = items.filter((l) => l.featured).length;
      return {
        slug: s.slug,
        name: s.name,
        description: s.description,
        cover: s.cover,
        verified: s.verified,
        place: `${s.town}, ${s.county}`,
        countLabel: `${items.length} listing${items.length === 1 ? "" : "s"}`,
        rating: "",
        featuredCount,
        featured: featuredCount > 0,
      };
    }),
    ...communityShops
      .filter((s) => !SHOPS.some((d) => d.slug === s.slug))
      .map((s, i) => ({
        slug: s.slug,
        name: s.name,
        description: s.description,
        cover: s.coverUrl || SHOP_COVER_FALLBACKS[i % SHOP_COVER_FALLBACKS.length],
        verified: s.verified,
        place: `${s.town}, ${s.county}`,
        countLabel: s.verified ? "Verified business" : "New shop",
        rating: "",
        featuredCount: 0,
      })),
  ];
  const shopRail = shuffleFeaturedFirst(shopCards).slice(0, 4);
  // Real ratings only: average of approved reviews per shown shop (no static stars).
  const shopRailLive = await Promise.all(
    shopRail.map(async (c) => ({
      ...c,
      rating: ratingLabel(await storeRead((st) => st.listApprovedReviewsForShop(c.slug), [])),
    }))
  );

  return (
    <div>
      {/* A: Hero + search — mobile-first: headline, search, swipeable categories */}
      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="container-bd grid items-center gap-6 py-8 md:py-10 lg:grid-cols-[240px_minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
          {/* Categories column — desktop (hover/tap reveals subcategories) */}
          <HeroCategories />
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-4xl xl:text-5xl">
              Everything You Need. <span className="text-brand-600">All in One Place.</span>
            </h1>
            <p className="mt-2 max-w-xl text-[15px] text-ink-500 sm:text-base">
              Shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.
            </p>
            <form action="/search" className="mt-4 flex max-w-xl overflow-hidden rounded-2xl border-2 border-brand-600 bg-white shadow-card">
              <input name="q" aria-label="Search the marketplace" placeholder="Search phones, cars, rentals, fundis…" className="w-full min-w-0 px-4 py-3 text-[15px] outline-none" />
              <button className="flex shrink-0 items-center gap-2 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700 sm:px-6" type="submit">
                <Search className="h-4 w-4" /> <span className="hidden min-[400px]:inline">Search</span>
              </button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/shop" className="btn-primary !h-11 !px-4 !text-sm sm:!px-6 sm:!text-base">Explore <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/start-selling" className="btn-secondary !h-11 !px-4 !text-sm sm:!px-6 sm:!text-base"><Store className="h-4 w-4" /> Sell on Chap</Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="self-center text-ink-400">Popular:</span>
              {POPULAR_SEARCHES.slice(0, 4).map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip hover:border-brand-600">{s}</Link>
              ))}
            </div>
          </div>
          {/* Desktop collage */}
          <div className="hidden grid-cols-2 gap-3 lg:grid" aria-hidden={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80" alt="Smartphones on Chap" className="h-52 rounded-2xl object-cover shadow-card" loading="eager" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80" alt="Cars on Chap" className="mt-5 h-52 rounded-2xl object-cover shadow-card" loading="eager" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80" alt="Furniture on Chap" className="h-44 rounded-2xl object-cover shadow-card" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80" alt="Fashion on Chap" className="mt-5 h-44 rounded-2xl object-cover shadow-card" loading="lazy" />
          </div>
        </div>
        {/* Mobile/tablet swipeable category strip with pics */}
        <div className="pb-7 lg:hidden">
          <div className="container-bd flex items-center justify-between">
            <p className="text-sm font-bold">Shop by category</p>
            <Link href="/shop" className="link-bd text-xs">View all →</Link>
          </div>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1" role="list" aria-label="Categories">
            {CATEGORIES.slice(0, 10).map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} role="listitem" className="card w-32 shrink-0 snap-start overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" loading="lazy" className="h-20 w-full object-cover" />
                <p className="truncate p-2 text-xs font-semibold">{c.name}</p>
              </Link>
            ))}
            <Link href="/shop" role="listitem" className="flex w-32 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-card border border-dashed border-brand-600/50 bg-brand-50 p-2 text-center">
              <span className="text-xs font-bold text-brand-700">View all categories →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="container-bd grid grid-cols-2 gap-4 py-4 text-sm lg:grid-cols-4">
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" /> Moderated listings & reporting</p>
          <p className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-brand-600" /> Verified sellers clearly labelled</p>
          <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" /> Delivery across all 47 counties</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600" /> Browse by county & town</p>
        </div>
      </section>

      {/* Featured products — paid boosts, always labelled, shuffled fresh each visit */}
      {featured.length > 0 && (
        <section className="container-bd py-10" aria-labelledby="featured">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 id="featured" className="section-title">Featured products</h2>
              <p className="text-sm text-ink-500">Promoted by sellers · always labelled Featured · never overrides safety.</p>
            </div>
            <Link href="/dashboard/promotion" className="link-bd">Promote yours →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {/* B: categories */}
      <section className="container-bd py-10" aria-labelledby="cats">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="cats" className="section-title">Browse categories</h2>
          <Link href="/shop" className="link-bd">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.slice(0, 12).map((c) => (
            <div key={c.slug} className="card group overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <Link href={`/shop/${c.slug}`}><img src={c.image} alt={c.name} loading="lazy" className="h-24 w-full object-cover transition group-hover:scale-105" /></Link>
              <div className="p-2.5">
                <Link href={`/shop/${c.slug}`} className="text-sm font-semibold leading-tight hover:text-brand-700">{c.name}</Link>
                {c.subcategories.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    {c.subcategories.slice(0, 3).map((s) => (
                      <Link key={s} href={`/search?category=${c.slug}&subcategory=${encodeURIComponent(s)}`} className="text-[11px] text-ink-500 hover:text-brand-700 hover:underline">{s}</Link>
                    ))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C: Today's Best Deals — genuine savings only */}
      <section className="bg-sand-50 py-10" aria-labelledby="deals">
        <div className="container-bd">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 id="deals" className="section-title">Today&apos;s Best Deals</h2>
              <p className="text-sm text-ink-500">Real savings from verified prices. No fake countdowns.</p>
            </div>
            <Link href="/deals" className="link-bd">All deals →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {deals.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      </section>

      {/* D: locations */}
      <section className="container-bd py-10" aria-labelledby="loc">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="loc" className="section-title">Shop by location</h2>
          <Link href="/location" className="link-bd">View all →</Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {countiesByListings.map((c) => (
            <Link key={c.county} href={`/location/${encodeURIComponent(c.county)}`} className="card group overflow-hidden transition hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.county} loading="lazy" className="h-20 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-24" />
              <div className="p-2.5">
                <p className="truncate text-sm font-bold leading-tight group-hover:text-brand-700">{c.county}</p>
                <p className="mt-0.5 text-xs text-ink-500">{c.count > 0 ? `${c.count} listing${c.count === 1 ? "" : "s"}` : "Explore →"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* E: trending near you */}
      <section className="container-bd py-4" aria-labelledby="near">
        <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <MapPin className="h-6 w-6 shrink-0 text-brand-600" />
          <div className="flex-1">
            <h2 id="near" className="text-lg font-bold">Trending near you</h2>
            <p className="text-sm text-ink-500">Pick your county to see relevant products & classifieds. No precise location needed.</p>
          </div>
          <form action="/search" className="flex w-full gap-2 sm:w-auto">
            <select name="county" aria-label="County" className="input-bd sm:w-52" defaultValue="all">
              <option value="all">All Kenya</option>
              {COUNTY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn-primary shrink-0" type="submit">Show</button>
          </form>
        </div>
      </section>

      {/* F: trusted shops */}
      <section className="container-bd py-10" aria-labelledby="shops">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 id="shops" className="section-title">Trusted business shops</h2>
            <p className="text-sm text-ink-500">Shops with featured products lead · fresh mix every visit.</p>
          </div>
          <Link href="/shops" className="link-bd">All shops →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shopRailLive.map((s) => (
            <Link key={s.slug} href={`/shops/${s.slug}`} className="card group overflow-hidden transition hover:shadow-lg">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.cover} alt={`${s.name} cover`} loading="lazy" className="h-28 w-full object-cover transition duration-300 group-hover:scale-105" />
                {s.featuredCount > 0 && (
                  <span className="absolute bottom-2.5 left-2.5 rounded-xl bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                    ★ {s.featuredCount} featured
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-bold">{s.name} {s.verified && <span className="text-brand-600">✓</span>}</p>
                <p className="text-xs text-ink-500">{s.place} · {s.rating} · {s.countLabel}</p>
                <p className="clamp-2 mt-1 text-sm text-ink-500">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* G: newly listed (everything mixed) */}
      <section className="container-bd py-4" aria-labelledby="new">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 id="new" className="section-title">Newly listed</h2>
            <p className="text-sm text-ink-500">Fresh products, classifieds and services from sellers across Kenya.</p>
          </div>
          <Link href="/search?sort=newest" className="link-bd">View newest →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {fresh.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>

      {/* G2: fresh classifieds */}
      <section className="bg-sand-50 py-10" aria-labelledby="fresh-classifieds">
        <div className="container-bd">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 id="fresh-classifieds" className="section-title">Fresh classifieds</h2>
              <p className="text-sm text-ink-500">New & pre-owned from individual sellers — enquire and negotiate.</p>
            </div>
            <Link href="/classifieds" className="link-bd">All classifieds →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {freshClassifieds.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      </section>

      {/* G3: from business shops */}
      <section className="container-bd py-10" aria-labelledby="from-shops">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 id="from-shops" className="section-title">From business shops</h2>
            <p className="text-sm text-ink-500">Catalogue picks from verified stores with delivery countrywide.</p>
          </div>
          <Link href="/shops" className="link-bd">All shops →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {fromShops.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>

      {/* I + J: sell + trust */}
      <section className="container-bd grid gap-3 py-10 lg:grid-cols-2">
        <div className="rounded-card bg-brand-700 p-6 text-white">
          <h2 className="text-2xl font-bold">Sell on Chap</h2>
          <p className="mt-2 text-sm opacity-90">Register free, list in minutes from your phone, reach buyers countrywide. Upgrade only when paid growth pays off.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Create a free account</li>
            <li>Post photos, price & location</li>
            <li>Answer enquiries & deliver</li>
          </ol>
          <div className="mt-4 flex gap-2">
            <Link href="/sell" className="btn-accent">Start selling</Link>
            <Link href="/pricing" className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">See plans</Link>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-bold">Trust & safety</h2>
          <ul className="mt-2 space-y-2 text-sm text-ink-700">
            <li>· Every listing can be reported; moderators review with reasons recorded.</li>
            <li>· Verification badges appear only after checks are completed.</li>
            <li>· Meet in public, inspect before paying, never share your M-Pesa PIN.</li>
            <li>· Jobs never charge application fees — report anyone who asks.</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Link href="/safety" className="btn-secondary">Buyer safety</Link>
            <Link href="/prohibited" className="btn-secondary">Prohibited items</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
