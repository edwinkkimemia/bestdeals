import Link from "next/link";
import { CATEGORIES, categoryBySlug } from "@/data/catalog";
import { searchListings } from "@/lib/search";
import { ListingCard } from "@/components/ui/listing-card";
import { COUNTY_NAMES } from "@/lib/kenya";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export const metadata = { title: "Search" };

export default function SearchPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const rawCounty = (searchParams.county ?? "").trim();
  const county = !rawCounty || rawCounty.toLowerCase() === "all" || rawCounty === "All Kenya" ? "all" : rawCounty;
  const params = {
    q: searchParams.q ?? "",
    category: searchParams.category ?? "all",
    county,
    min: searchParams.min ? Number(searchParams.min) : undefined,
    max: searchParams.max ? Number(searchParams.max) : undefined,
    condition: searchParams.condition ?? "all",
    type: (searchParams.type as "product" | "classified" | "service" | "all") ?? "all",
    sort: (searchParams.sort as "relevance" | "newest" | "price_asc" | "price_desc") ?? "relevance",
    page: searchParams.page ? Number(searchParams.page) : 1,
  };
  const { items, total } = searchListings(params);
  const cat = categoryBySlug(params.category ?? "");

  // One combined search across shop products, classifieds and services.
  // Per-type counts power the tabs (in production this is a single faceted query).
  const counts = {
    all: total,
    product: searchListings({ ...params, type: "product", page: 1, perPage: 1 }).total,
    classified: searchListings({ ...params, type: "classified", page: 1, perPage: 1 }).total,
    service: searchListings({ ...params, type: "service", page: 1, perPage: 1 }).total,
  };
  const keep = new URLSearchParams();
  if (params.q) keep.set("q", params.q);
  if (params.category && params.category !== "all") keep.set("category", params.category);
  if (params.county && params.county !== "all") keep.set("county", params.county);
  if (searchParams.min) keep.set("min", searchParams.min);
  if (searchParams.max) keep.set("max", searchParams.max);
  if (params.condition && params.condition !== "all") keep.set("condition", params.condition);
  if (params.sort && params.sort !== "relevance") keep.set("sort", params.sort);
  const tabHref = (t: string) => {
    const s = new URLSearchParams(keep);
    if (t !== "all") s.set("type", t);
    const qs = s.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  };
  const tabs = [
    { key: "all", label: "All results", n: counts.all },
    { key: "product", label: "Shop products", n: counts.product },
    { key: "classified", label: "Classifieds", n: counts.classified },
    { key: "service", label: "Services", n: counts.service },
  ];

  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: params.q ? `Search: ${params.q.slice(0, 40)}` : "Search" }]} />
      <h1 className="section-title mt-2">
        {params.q ? `Results for “${params.q}”` : "Browse the marketplace"} ({total})
      </h1>

      <div className="mt-5 grid gap-6 lg:grid-cols-[240px_1fr]">
        <form action="/search" method="get" className="card h-fit space-y-3 p-4">
          <input type="hidden" name="q" value={params.q} />
          <div>
            <label className="label-bd" htmlFor="f-cat">Category</label>
            <select id="f-cat" name="category" defaultValue={params.category} className="input-bd">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-bd" htmlFor="f-county">Location</label>
            <select id="f-county" name="county" defaultValue={params.county} className="input-bd">
              <option value="all">All Kenya</option>
              {COUNTY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
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
            <label className="label-bd" htmlFor="f-sort">Sort</label>
            <select id="f-sort" name="sort" defaultValue={params.sort} className="input-bd">
              <option value="relevance">Most relevant</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
          </div>
          <button className="btn-primary w-full" type="submit">Apply filters</button>
          {cat?.attributes?.length ? (
            <p className="text-xs text-ink-400">Category attributes ({cat.attributes.map((a) => a.label).join(", ")}) apply on listing pages.</p>
          ) : null}
        </form>

        <div>
          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Result types">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                role="tab"
                aria-selected={params.type === t.key}
                className={`chip !px-3.5 !py-1.5 !text-[13px] ${params.type === t.key ? "!border-brand-600 !bg-brand-50 !text-brand-700 font-bold" : "hover:border-brand-600"}`}
              >
                {t.label} ({t.n})
              </Link>
            ))}
          </div>
          {params.type === "all" && total > 0 && (
            <p className="mb-3 text-xs text-ink-400">
              Combined results: {counts.product} shop · {counts.classified} classifieds{counts.service > 0 ? ` · ${counts.service} services` : ""}. Cards are labelled by type.
            </p>
          )}
          {items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-lg font-bold">No results found</p>
              <p className="mt-1 text-sm text-ink-500">Try a different keyword, widen the price range, or browse categories.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {params.type !== "all" && (
                  <Link href={tabHref("all")} className="btn-primary">Show all types ({counts.all})</Link>
                )}
                <Link href="/shop" className="btn-secondary">Browse Shop</Link>
                <Link href="/classifieds" className="btn-secondary">Browse Classifieds</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {items.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
