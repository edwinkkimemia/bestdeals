import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, MapPin, Search, ShieldCheck, Store, Truck } from "lucide-react";
import { CATEGORIES, LISTINGS, SHOPS, POPULAR_SEARCHES } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "chap.co.ke — Kenya's Marketplace for Everything",
  description: "Discover great deals, shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.",
};

const ICONS: Record<string, string> = {};

export default function HomePage() {
  const deals = LISTINGS.filter((l) => l.compareAt && l.compareAt > l.price).slice(0, 4);
  const featured = LISTINGS.filter((l) => l.featured).slice(0, 4);
  const fresh = [...LISTINGS].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
  const freshClassifieds = LISTINGS.filter((l) => l.listingType === "classified")
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);
  const fromShops = LISTINGS.filter((l) => l.shopSlug)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4);

  return (
    <div>
      {/* A: Hero + search — fits one viewport, no scrolling needed */}
      <section className="flex min-h-[calc(100svh-10rem)] items-center bg-gradient-to-b from-brand-50 to-white">
        <div className="container-bd grid w-full items-center gap-6 py-8 lg:grid-cols-2 lg:gap-8">
          <div>
            <Badge tone="green">🇰🇪 Made for Kenya · KES · M-Pesa ready</Badge>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl xl:text-5xl">
              Everything You Need. <span className="text-brand-600">All in One Place.</span>
            </h1>
            <p className="mt-3 max-w-xl text-base text-ink-500">
              Discover great deals, shop trusted businesses, buy and sell new or pre-owned items, and find services across Kenya.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary !h-11 !px-6 !text-base">Explore Marketplace <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/sell" className="btn-secondary !h-11 !px-6 !text-base"><Store className="h-4 w-4" /> Sell on Chap</Link>
            </div>
            <form action="/search" className="mt-4 flex max-w-xl overflow-hidden rounded-2xl border-2 border-brand-600 bg-white shadow-card">
              <input name="q" aria-label="Search the marketplace" placeholder="Try 'Samsung A55' or '2 bedroom Mtwapa'…" className="w-full px-4 py-2.5 text-sm outline-none" />
              <button className="flex items-center gap-2 bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700" type="submit">
                <Search className="h-4 w-4" /> Search
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="text-ink-400">Popular:</span>
              {POPULAR_SEARCHES.slice(0, 5).map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip hover:border-brand-600">{s}</Link>
              ))}
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid" aria-hidden={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80" alt="Smartphones on Chap" className="h-40 rounded-2xl object-cover shadow-card lg:h-52" loading="eager" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80" alt="Cars on Chap" className="mt-4 h-40 rounded-2xl object-cover shadow-card lg:h-52" loading="eager" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80" alt="Furniture on Chap" className="h-36 rounded-2xl object-cover shadow-card lg:h-44" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80" alt="Fashion on Chap" className="mt-4 h-36 rounded-2xl object-cover shadow-card lg:h-44" loading="lazy" />
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

      {/* B: categories */}
      <section className="container-bd py-10" aria-labelledby="cats">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="cats" className="section-title">Browse categories</h2>
          <Link href="/shop" className="link-bd">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.slice(0, 12).map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className="card group overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.name} loading="lazy" className="h-24 w-full object-cover transition group-hover:scale-105" />
              <p className="p-2.5 text-sm font-semibold leading-tight">{c.name}</p>
            </Link>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {deals.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      </section>

      {/* D: departments */}
      <section className="container-bd py-10" aria-labelledby="dept">
        <h2 id="dept" className="section-title">Shop by department</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.slice(0, 8).map((c, i) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className={`rounded-card p-5 text-white transition hover:opacity-95 ${i % 4 === 0 ? "bg-brand-700" : i % 4 === 1 ? "bg-ink-900" : i % 4 === 2 ? "bg-accent-600" : "bg-brand-600"}`}>
              <p className="text-lg font-bold">{c.name}</p>
              <p className="mt-1 text-sm opacity-80">{c.blurb}</p>
              <p className="mt-3 text-sm font-semibold">Shop now →</p>
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
            <input name="county" placeholder="e.g. Nakuru" aria-label="County" className="input-bd sm:w-52" />
            <button className="btn-primary shrink-0" type="submit">Show</button>
          </form>
        </div>
      </section>

      {/* F: trusted shops */}
      <section className="container-bd py-10" aria-labelledby="shops">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="shops" className="section-title">Trusted business shops</h2>
          <Link href="/shops" className="link-bd">All shops →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHOPS.map((s) => (
            <Link key={s.slug} href={`/shops/${s.slug}`} className="card overflow-hidden transition hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.cover} alt={`${s.name} cover`} loading="lazy" className="h-28 w-full object-cover" />
              <div className="p-4">
                <p className="font-bold">{s.name} {s.verified && <span className="text-brand-600">✓</span>}</p>
                <p className="text-xs text-ink-500">{s.town}, {s.county} · ★ {s.rating} · {s.listingsCount} listings</p>
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
