import Link from "next/link";
import { Fragment } from "react";
import { BadgeCheck, MapPin, Package, TrendingUp } from "lucide-react";
import type { Category, Listing } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { formatKES } from "@/lib/format";
import { countySlug } from "@/lib/kenya";
import { categoryPath, type CategoryPriceRange } from "@/lib/category-seo";

type Props = {
  category: Category;
  subcategory?: string;
  total: number;
  items: Listing[];
  counties: { county: string; count: number }[];
  prices: CategoryPriceRange;
  brands: string[];
  intro: string;
  faqs: { q: string; a: string }[];
  jsonLd: Record<string, unknown>;
};

/** Shared category/subcategory landing page: hero, listings, market data, FAQs. */
export function CategoryLanding({
  category,
  subcategory,
  total,
  items,
  counties,
  prices,
  brands,
  intro,
  faqs,
  jsonLd,
}: Props) {
  const label = subcategory ?? category.name;
  const siblings = category.subcategories.filter((s) => s !== subcategory);

  return (
    <div className="container-bd py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageBreadcrumb
        trail={[
          { href: "/", label: "Home" },
          { href: "/browse", label: "Browse" },
          ...(subcategory ? [{ href: categoryPath(category), label: category.name }] : []),
          { label },
        ]}
      />

      <section className="card mt-2 overflow-hidden">
        <div className="relative bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 px-5 py-7 text-white sm:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">
              {subcategory ? category.name : "Shop by category"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
              {label} in Kenya
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/90">{intro}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/15 px-3 py-1">
                {total.toLocaleString()} live listing{total === 1 ? "" : "s"}
              </span>
              {prices && (
                <span className="rounded-full bg-white/15 px-3 py-1">
                  {formatKES(prices.min)} – {formatKES(prices.max)}
                </span>
              )}
              {counties[0] && (
                <span className="rounded-full bg-white/15 px-3 py-1">
                  Popular in {counties[0].county}
                </span>
              )}
              {items.some((l) => l.verified) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified sellers available
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label={`${category.name} subcategories`}>
        <Link
          href={categoryPath(category)}
          className={`chip hover:border-brand-600 ${subcategory ? "" : "!border-brand-600 !text-brand-700"}`}
        >
          All {category.name}
        </Link>
        {siblings.map((s) => (
          <Link
            key={s}
            href={categoryPath(category, s)}
            className="chip hover:border-brand-600 hover:text-brand-700"
          >
            {s}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-bold">No {label.toLowerCase()} listings yet</p>
          <p className="mt-1 text-sm text-ink-500">
            Be the first to <Link href="/sell" className="link-bd">list an item here</Link> — new
            listings are reviewed and appear quickly.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((l, i) => (
            <Fragment key={l.id}>
              <ListingCard listing={l} />
              <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
            </Fragment>
          ))}
        </div>
      )}

      <section className="mt-10" aria-labelledby="market-title">
        <h2 id="market-title" className="flex items-center gap-2 font-bold">
          <TrendingUp className="h-4 w-4 text-brand-600" /> {label} market snapshot
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <Package className="h-3.5 w-3.5" /> Supply
            </p>
            <p className="mt-2 text-2xl font-extrabold">{total.toLocaleString()}</p>
            <p className="text-sm text-ink-500">
              live {label.toLowerCase()} listing{total === 1 ? "" : "s"} from sellers across Kenya
            </p>
          </div>
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <TrendingUp className="h-3.5 w-3.5" /> Price range
            </p>
            <p className="mt-2 text-2xl font-extrabold">
              {prices ? `${formatKES(prices.min)} – ${formatKES(prices.max)}` : "Varies"}
            </p>
            <p className="text-sm text-ink-500">
              {prices
                ? `based on ${prices.count} priced listing${prices.count === 1 ? "" : "s"} on this page`
                : "compare seller prices before you buy"}
            </p>
          </div>
          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <MapPin className="h-3.5 w-3.5" /> Where to buy
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {counties.slice(0, 4).map((c) => (
                <li key={c.county}>
                  <Link href={`/location/${countySlug(c.county)}`} className="link-bd">
                    {c.county}
                  </Link>{" "}
                  <span className="text-ink-400">({c.count})</span>
                </li>
              ))}
              {counties.length === 0 && <li className="text-ink-500">Countrywide delivery available</li>}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Buying {label.toLowerCase()} on Chap</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-700">
            <li>Compare condition, warranty and total delivery cost — not just the headline price.</li>
            <li>Check the seller&apos;s ✓ verification badge, shop page and reviews before paying.</li>
            <li>Use buy-online checkout or agree a safe public meet-up; never share your M-Pesa PIN.</li>
          </ul>
          {brands.length > 0 && (
            <p className="mt-3 text-sm text-ink-500">
              Popular brands:{" "}
              {brands.slice(0, 6).map((b, i) => (
                <span key={b}>
                  {i > 0 && " · "}
                  <Link href={`/search?q=${encodeURIComponent(b)}`} className="link-bd">{b}</Link>
                </span>
              ))}
            </p>
          )}
          {subcategory && (
            <p className="mt-3 text-sm">
              <Link href={categoryPath(category)} className="link-bd">
                Browse all {category.name} →
              </Link>
            </p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-bold">{label} questions buyers ask</h2>
          <div className="mt-3 divide-y divide-neutral-200">
            {faqs.map((f) => (
              <details key={f.q} className="group py-2">
                <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-1.5 text-sm text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-8 text-xs text-ink-400">
        Prices are in Kenyan shillings (KES). Listings are posted by sellers and reviewed by Chap;
        always confirm item details with the seller before paying.
      </p>
    </div>
  );
}
