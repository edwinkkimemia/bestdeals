import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, MapPin, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { CATEGORIES, LISTINGS, SHOPS, POPULAR_SEARCHES, shopListings } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { ListingCard } from "@/components/ui/listing-card";
import { HeroCategories } from "@/components/hero-categories";
import { CategoryStrip } from "@/components/category-strip";
import { CountyStrip } from "@/components/county-strip";
import { COUNTY_NAMES, KENYA_COUNTIES } from "@/lib/kenya";
import { shuffleFeaturedFirst, shuffleSeeded } from "@/lib/search";
import { ratingLabel } from "@/lib/ratings";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";

export const metadata: Metadata = {
  title: { absolute: "chap.co.ke — Kenya's Marketplace for Everything" },
  description: "Discover great deals, shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.",
  keywords: [
    "Kenya marketplace",
    "buy and sell in Kenya",
    "online shopping Kenya",
    "shops in Nairobi",
    "classifieds Kenya",
    "services Kenya",
    "chap.co.ke",
  ],
  alternates: { canonical: "https://chap.co.ke/" },
  openGraph: {
    type: "website",
    title: "chap.co.ke — Everything You Need. All in One Place.",
    description: "Shop products, classifieds, business shops and local services across Kenya.",
    url: "https://chap.co.ke/",
    siteName: "chap.co.ke",
    locale: "en_KE",
    images: [{ url: "/chaplogo.png", width: 1147, height: 287, alt: "chap.co.ke — Kenya's marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "chap.co.ke — Kenya's Marketplace for Everything",
    description: "Shop products, classifieds, business shops and local services across Kenya.",
    images: ["/chaplogo.png"],
  },
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
  const user = await currentUser().catch(() => null);
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  // Hero collage: four different categories (and distinct photos) shuffled on every request.
  const seenHeroImages = new Set<string>();
  const heroCategories = shuffleSeeded(
    CATEGORIES.filter((c) => c.slug !== "other"),
    Math.floor(Math.random() * 1_000_000_000)
  )
    .filter((c) => {
      if (seenHeroImages.has(c.image)) return false;
      seenHeroImages.add(c.image);
      return true;
    })
    .slice(0, 4);
  const liveAll = await getLiveStoreListings();
  // Stamp the merged set: static catalogue rows need live plan/verified flags
  // for card checkmarks, not just the store half.
  const all = await withLiveVerification(mergeStaticAndLive(LISTINGS, liveAll));
  const deals = shuffleFeaturedFirst(all.filter((l) => l.compareAt && l.compareAt > l.price)).slice(0, 6);
  const featured = shuffleFeaturedFirst(all.filter((l) => l.featured)).slice(0, 12);
  const fresh = shuffleFeaturedFirst([...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 36)).slice(0, 12);
  const freshClassifieds = shuffleFeaturedFirst(all.filter((l) => l.listingType === "classified")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 18)).slice(0, 6);
  const fromShops = shuffleFeaturedFirst(all.filter((l) => l.shopSlug)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 18)).slice(0, 6);
  const countiesByListings = [...KENYA_COUNTIES]
    .map((c) => ({
      ...c,
      count: all.filter((l) => l.county.trim().toLowerCase() === c.county.toLowerCase()).length,
    }))
    .sort((a, b) => b.count - a.count);
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
              Discover It. Buy It. <span className="text-brand-600">Sell It.</span>
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
              <Link href="/browse" className="btn-primary !h-11 !px-4 !text-sm sm:!px-6 sm:!text-base">Explore <ArrowRight className="h-4 w-4" /></Link>
              <Link href={user ? "/sell" : "/start-selling"} className="btn-secondary !h-11 !px-4 !text-sm sm:!px-6 sm:!text-base"><Store className="h-4 w-4" /> Sell on Chap</Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="self-center text-ink-400">Popular:</span>
              {POPULAR_SEARCHES.slice(0, 4).map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip hover:border-brand-600">{s}</Link>
              ))}
            </div>
          </div>
          {/* Desktop collage — four random categories, refreshed every visit */}
          <div className="hidden grid-cols-2 gap-3 lg:grid">
            {heroCategories.map((c, i) => (
              <Link
                key={c.slug}
                href={`/browse/${c.slug}`}
                aria-label={`Browse ${c.name}`}
                className={`group relative block overflow-hidden rounded-2xl shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${i % 2 === 1 ? "mt-5" : ""} ${i < 2 ? "h-52" : "h-44"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading={i < 2 ? "eager" : "lazy"}
                />
                <span aria-hidden className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-bold text-white">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
        {/* Mobile/tablet swipeable category strip — all categories, one compact row */}
        <div className="container-bd pb-7 lg:hidden">
          <CategoryStrip title="Browse by category" viewAllHref="/browse" />
        </div>
      </section>

      {/* trust strip */}
      <section className="hidden border-y border-neutral-200 bg-white sm:block">
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

      {/* B: categories — compact desktop rail; mobile uses the hero slider */}
      <section className="container-bd hidden py-8 lg:block">
        <CategoryStrip title="Browse categories" viewAllHref="/browse" />
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
            {deals.map((l, i) => (
              <Fragment key={l.id}>
                <ListingCard listing={l} />
                <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* D: locations — compact national rail, listings stay close to the top */}
      <section className="container-bd py-6">
        <CountyStrip counties={countiesByListings} title="Shop by location" viewAllHref="/location" />
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
          {fresh.map((l, i) => (
            <Fragment key={l.id}>
              <ListingCard listing={l} />
              <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
            </Fragment>
          ))}
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
