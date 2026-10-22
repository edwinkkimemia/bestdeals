import Link from "next/link";
import { Fragment } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { CATEGORIES, categoryBySlug } from "@/data/catalog";
import { searchAll, type SearchParams } from "@/lib/search";
import { searchEntities } from "@/lib/entity-search";
import { ListingCard } from "@/components/ui/listing-card";
import { SellerResultCard, ShopResultCard } from "@/components/search-entity-cards";
import { AdAfterEvery } from "@/components/ads";
import { AD_SLOTS } from "@/lib/ads";
import { COUNTY_NAMES, resolveCounty, townsFor } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { SaveSearchButton } from "@/components/save-search-button";

export const metadata = { title: "Search" };

type PageType = "all" | "product" | "classified" | "service" | "sellers" | "shops";

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  // Canonicalises case ("nakuru" → "Nakuru") and towns ("Eldoret" → "Uasin Gishu").
  const rawCounty = (searchParams.county ?? "").trim();
  const county = resolveCounty(rawCounty);
  const countyFallback = rawCounty.length > 0 && county === "all";
  const postedKey = searchParams.posted ?? "any";
  const postedWithinHours =
    postedKey === "24h" ? 24 : postedKey === "7d" ? 168 : postedKey === "30d" ? 720 : undefined;
  const rawType = searchParams.type ?? "all";
  const pageType: PageType =
    rawType === "product" || rawType === "classified" || rawType === "service" || rawType === "sellers" || rawType === "shops"
      ? rawType
      : "all";
  const isEntityTab = pageType === "sellers" || pageType === "shops";
  const listingType: SearchParams["type"] =
    pageType === "product" || pageType === "classified" || pageType === "service" ? pageType : "all";
  const seller: NonNullable<SearchParams["seller"]> =
    searchParams.seller === "individual" || searchParams.seller === "business"
      ? searchParams.seller
      : "all";
  const params: SearchParams = {
    q: searchParams.q ?? "",
    category: searchParams.category ?? "all",
    subcategory: searchParams.subcategory ?? "all",
    county,
    postedWithinHours,
    town: (searchParams.town ?? "all").trim() || "all",
    min: searchParams.min ? Number(searchParams.min) : undefined,
    max: searchParams.max ? Number(searchParams.max) : undefined,
    condition: searchParams.condition ?? "all",
    type: listingType,
    seller,
    sort: (searchParams.sort as "relevance" | "newest" | "price_asc" | "price_desc") ?? "relevance",
    page: searchParams.page ? Number(searchParams.page) : 1,
  };

  // Listings and entity profiles share the same query + location filters.
  // Entity tabs still load the listing total so the "All results" tab count
  // and back-links stay accurate.
  const [main, productCount, classifiedCount, serviceCount, entities] = await Promise.all([
    searchAll({ ...params, page: isEntityTab ? 1 : params.page, perPage: isEntityTab ? 1 : undefined }),
    searchAll({ ...params, type: "product", page: 1, perPage: 1 }).then((r) => r.total),
    searchAll({ ...params, type: "classified", page: 1, perPage: 1 }).then((r) => r.total),
    searchAll({ ...params, type: "service", page: 1, perPage: 1 }).then((r) => r.total),
    searchEntities({ q: params.q, county: params.county, town: params.town }),
  ]);
  const { items, total: listingTotal } = main;
  const sellerCount = entities.sellers.length;
  const shopCount = entities.shops.length;
  // The All tab shows listings only; seller and shop profiles live in their
  // own tabs instead of being mixed into product results.
  const allCount = listingTotal;
  const counts = {
    all: allCount,
    product: productCount,
    classified: classifiedCount,
    service: serviceCount,
    sellers: sellerCount,
    shops: shopCount,
  };
  const total =
    pageType === "sellers" ? sellerCount : pageType === "shops" ? shopCount : pageType === "all" ? allCount : listingTotal;
  const cat = categoryBySlug(params.category ?? "");

  const keep = new URLSearchParams();
  if (params.q) keep.set("q", params.q);
  if (params.category && params.category !== "all") keep.set("category", params.category);
  if (params.subcategory && params.subcategory !== "all") keep.set("subcategory", params.subcategory);
  if (params.county && params.county !== "all") keep.set("county", params.county);
  if (postedKey !== "any") keep.set("posted", postedKey);
  if (params.town && params.town !== "all") keep.set("town", params.town);
  if (searchParams.min) keep.set("min", searchParams.min);
  if (searchParams.max) keep.set("max", searchParams.max);
  if (params.condition && params.condition !== "all") keep.set("condition", params.condition);
  if (params.seller && params.seller !== "all") keep.set("seller", params.seller);
  if (params.sort && params.sort !== "relevance") keep.set("sort", params.sort);
  const hrefWith = (mutate: (query: URLSearchParams) => void) => {
    const query = new URLSearchParams(keep);
    mutate(query);
    if (pageType !== "all") query.set("type", pageType);
    const qs = query.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  };
  const tabHref = (type: PageType) => {
    const query = new URLSearchParams(keep);
    if (type !== "all") query.set("type", type);
    const qs = query.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  };
  const clearCountyHref = hrefWith((query) => {
    query.delete("county");
    query.delete("town");
  });
  const clearPostedHref = hrefWith((query) => query.delete("posted"));
  const clearTownHref = hrefWith((query) => query.delete("town"));
  const clearSubHref = hrefWith((query) => query.delete("subcategory"));
  const tabs: { key: PageType; label: string; n: number }[] = [
    { key: "all", label: "All results", n: counts.all },
    { key: "product", label: "Shop products", n: counts.product },
    { key: "classified", label: "Classifieds", n: counts.classified },
    { key: "service", label: "Services", n: counts.service },
    { key: "sellers", label: "Sellers", n: counts.sellers },
    { key: "shops", label: "Shops", n: counts.shops },
  ];
  const entityTabResults = pageType === "sellers" ? entities.sellers : pageType === "shops" ? entities.shops : [];
  const activeFilterCount = [
    Boolean(params.q?.trim()),
    !isEntityTab && params.category !== "all",
    !isEntityTab && params.subcategory !== "all",
    params.county !== "all",
    params.town !== "all",
    !isEntityTab && Boolean(searchParams.min),
    !isEntityTab && Boolean(searchParams.max),
    !isEntityTab && params.condition !== "all",
    !isEntityTab && params.type !== "all",
    !isEntityTab && params.seller !== "all",
    !isEntityTab && params.sort !== "relevance",
    !isEntityTab && postedKey !== "any",
  ].filter(Boolean).length;
  const heading = params.q
    ? `Results for “${params.q}”`
    : pageType === "sellers"
      ? "Browse sellers"
      : pageType === "shops"
        ? "Browse shops"
        : "Browse the marketplace";

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: params.q ? `Search: ${params.q.slice(0, 40)}` : "Search" }]} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="section-title">
          {heading} ({total})
        </h1>
        {!isEntityTab && (
          <SaveSearchButton
            query={{
              q: params.q || undefined,
              category: params.category,
              subcategory: params.subcategory,
              county: params.county,
              town: params.town,
              min: params.min,
              max: params.max,
              condition: params.condition,
              type: params.type,
              seller: params.seller !== "all" ? params.seller : undefined,
            }}
            name={params.q ? `“${params.q.slice(0, 40)}”` : cat ? cat.name : county !== "all" ? county : "Marketplace watch"}
          />
        )}
      </div>
      {countyFallback && (
        <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Location “{rawCounty}” isn&apos;t a recognised county — showing all of Kenya instead. Try the Location filter.
        </p>
      )}
      {county !== "all" && (
        <p className="mt-2 text-sm text-ink-500">Showing results in <strong>{county}</strong>{params.town !== "all" && <> · <strong>{params.town}</strong> · <Link href={clearTownHref} className="link-bd">clear town</Link></>} · <Link href={clearCountyHref} className="link-bd">clear</Link></p>
      )}
      {!isEntityTab && postedWithinHours && (
        <p className="mt-1 text-sm text-ink-500">Posted within <strong>{postedKey === "24h" ? "24 hours" : postedKey === "7d" ? "7 days" : "30 days"}</strong> · <Link href={clearPostedHref} className="link-bd">clear</Link></p>
      )}
      {!isEntityTab && params.subcategory !== "all" && (
        <p className="mt-1 text-sm text-ink-500">Subcategory <strong>{params.subcategory}</strong> · <Link href={clearSubHref} className="link-bd">clear</Link></p>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="card h-fit overflow-hidden">
          <input id="search-filters-toggle" type="checkbox" className="peer sr-only lg:hidden" />
          <label
            htmlFor="search-filters-toggle"
            className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-brand-600 lg:hidden peer-checked:[&>svg]:rotate-180"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-brand-600" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {activeFilterCount} active
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform" />
          </label>
          <form
            id="search-filters"
            action="/search"
            method="get"
            className="hidden space-y-3 border-t border-neutral-200 p-4 peer-checked:block lg:block lg:border-t-0"
          >
          <div>
            <label className="label-bd" htmlFor="f-q">Keyword</label>
            <input
              id="f-q"
              name="q"
              defaultValue={params.q}
              className="input-bd"
              placeholder="Product, seller or shop"
              autoComplete="off"
            />
          </div>
          {isEntityTab && <input type="hidden" name="type" value={pageType} />}
          {isEntityTab && (
            <p className="text-xs text-ink-500">Searching seller and shop profiles by name, category or location.</p>
          )}
          {!isEntityTab && (
            <div>
              <label className="label-bd" htmlFor="f-cat">Category</label>
              <select id="f-cat" name="category" defaultValue={params.category} className="input-bd">
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          )}
          {!isEntityTab && cat && cat.subcategories.length > 0 && (
            <div>
              <label className="label-bd" htmlFor="f-sub">Subcategory</label>
              <select id="f-sub" name="subcategory" defaultValue={params.subcategory} className="input-bd">
                <option value="all">All {cat.name}</option>
                {cat.subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label-bd" htmlFor="f-county">Location</label>
            <select id="f-county" name="county" defaultValue={params.county} className="input-bd">
              <option value="all">All Kenya</option>
              {COUNTY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {county !== "all" && (
            <div>
              <label className="label-bd" htmlFor="f-town">Town</label>
              <select id="f-town" name="town" defaultValue={params.town} className="input-bd">
                <option value="all">All {county}</option>
                {townsFor(county).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          {!isEntityTab && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label-bd" htmlFor="f-min">Min KES</label><input id="f-min" name="min" inputMode="numeric" defaultValue={searchParams.min ?? ""} className="input-bd" placeholder="0" /></div>
                <div><label className="label-bd" htmlFor="f-max">Max KES</label><input id="f-max" name="max" inputMode="numeric" defaultValue={searchParams.max ?? ""} className="input-bd" placeholder="Any" /></div>
              </div>
              <div>
                <label className="label-bd" htmlFor="f-cond">Condition</label>
                <select id="f-cond" name="condition" defaultValue={params.condition} className="input-bd">
                  <option value="all">Any</option>
                  <option value="new">New</option>
                  <option value="like_new">Like new</option>
                  <option value="used_good">Used · good</option>
                  <option value="used_fair">Used · fair</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
              <div>
                <label className="label-bd" htmlFor="f-type">Listing type</label>
                <select id="f-type" name="type" defaultValue={params.type} className="input-bd">
                  <option value="all">All</option>
                  <option value="product">Shoppable products</option>
                  <option value="classified">Classifieds</option>
                  <option value="service">Services</option>
                </select>
              </div>
              <div>
                <label className="label-bd" htmlFor="f-seller">Seller</label>
                <select id="f-seller" name="seller" defaultValue={params.seller} className="input-bd">
                  <option value="all">All sellers</option>
                  <option value="individual">Individual sellers</option>
                  <option value="business">Business sellers</option>
                </select>
              </div>
              <div>
                <label className="label-bd" htmlFor="f-sort">Sort</label>
                <select id="f-sort" name="sort" defaultValue={params.sort} className="input-bd">
                  <option value="relevance">Most relevant</option>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: low → high</option>
                  <option value="price_desc">Price: high → low</option>
                </select>
              </div>
              <div>
                <label className="label-bd" htmlFor="f-posted">Posted within</label>
                <select id="f-posted" name="posted" defaultValue={postedKey} className="input-bd">
                  <option value="any">Any time</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </>
          )}
          <button className="btn-primary w-full" type="submit">Apply filters</button>
          {!isEntityTab && cat?.attributes?.length ? (
            <p className="text-xs text-ink-400">Category attributes ({cat.attributes.map((a) => a.label).join(", ")}) apply on listing pages.</p>
          ) : null}
          </form>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Result types">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                role="tab"
                aria-selected={pageType === t.key}
                className={`chip !px-3.5 !py-1.5 !text-[13px] ${pageType === t.key ? "!border-brand-600 !bg-brand-50 !text-brand-700 font-bold" : "hover:border-brand-600"}`}
              >
                {t.label} ({t.n})
              </Link>
            ))}
          </div>
          {pageType === "all" && allCount > 0 && (
            <p className="mb-3 text-xs text-ink-400">
              Combined results: {productCount} shop · {classifiedCount} classifieds{serviceCount > 0 ? ` · ${serviceCount} services` : ""}. Cards are labelled by type.
            </p>
          )}

          {isEntityTab ? (
            entityTabResults.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-lg font-bold">No {pageType === "sellers" ? "sellers" : "shops"} found</p>
                <p className="mt-1 text-sm text-ink-500">Try a different name or location, or browse all results.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href={tabHref("all")} className="btn-primary">Show all results ({counts.all})</Link>
                  <Link href={pageType === "sellers" ? "/shops" : "/search?type=sellers"} className="btn-secondary">
                    {pageType === "sellers" ? "Browse shops" : "Browse sellers"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pageType === "sellers"
                  ? entities.sellers.map((s) => <SellerResultCard key={s.key} seller={s} />)
                  : entities.shops.map((s) => <ShopResultCard key={s.slug} shop={s} />)}
              </div>
            )
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-lg font-bold">No results found</p>
              <p className="mt-1 text-sm text-ink-500">
                Try a different keyword, widen the price range, or browse categories — or save this search and we’ll ring the bell when a matching ad lands.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {pageType !== "all" && (
                  <Link href={tabHref("all")} className="btn-primary">Show all types ({counts.all})</Link>
                )}
                <Link href="/search" className="btn-secondary">Clear search</Link>
                <Link href="/shop" className="btn-secondary">Browse Shop</Link>
                <Link href="/classifieds" className="btn-secondary">Browse Classifieds</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((l, i) => (
                <Fragment key={l.id}>
                  <ListingCard listing={l} />
                  <AdAfterEvery index={i} slot={AD_SLOTS.feed} />
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
