import Link from "next/link";
import { CATEGORIES, LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { CategoryIcon } from "@/components/category-icon";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Classifieds — New & Pre-owned in Kenya",
  description: "Buy and sell new and second-hand goods person-to-person across Kenya. Enquire, negotiate, meet safely.",
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default async function ClassifiedsIndex() {
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const live = (await getLiveStoreListings()).filter((l) => l.listingType === "classified");
  const items = shuffleFeaturedFirst(
    await withLiveVerification(
      mergeStaticAndLive(
        LISTINGS.filter((l) => l.listingType === "classified"),
        live
      )
    )
  );
  // Per-category browser with live counts (static + seller ads).
  const inCategory = (slug: string) => items.filter((l) => l.categorySlug === slug);
  const catCount = (slug: string) => inCategory(slug).length;
  const topSubs = (slug: string) => {
    const counts = new Map<string, number>();
    for (const l of inCategory(slug)) {
      const sub = (l.subcategory ?? "").trim();
      if (sub) counts.set(sub, (counts.get(sub) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  };
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Classifieds" }]} />
      <h1 className="section-title mt-2">Classifieds</h1>
      <p className="text-sm text-ink-500">New & secondhand from individuals and businesses. Enquire, negotiate and meet safely — no checkout pressure.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/sell?type=classified" className="btn-primary">Post a free ad</Link>
        <Link href="/safety" className="btn-secondary">Safety tips</Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "1. Find & filter", d: "Search by keyword, price range, condition, and county. Negotiable items carry a red badge." },
          { t: "2. Enquire direct", d: "Message the seller on Chap, ask for more photos, agree the price — keep chats on-platform." },
          { t: "3. Meet & inspect", d: "Public daytime meet-ups, inspect before paying, confirm M-Pesa details face-to-face." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-bold">Browse by category</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c) => {
          const n = catCount(c.slug);
          return (
            <Link key={c.slug} href={`/search?category=${c.slug}&type=classified`} className="card group overflow-hidden hover:border-brand-600">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" loading="lazy" className="h-20 w-full object-cover transition duration-300 group-hover:scale-105" />
                <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-brand-700 shadow">
                  <CategoryIcon name={c.icon} className="h-4 w-4" />
                </span>
                {n > 0 && (
                  <span className="absolute bottom-2 right-2 rounded-xl bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                    {n} ad{n === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold leading-tight group-hover:text-brand-700">{c.name}</p>
                {topSubs(c.slug).length > 0 && (
                  <p className="mt-1.5 flex flex-wrap gap-1">
                    {topSubs(c.slug).map(([s, count]) => (
                      <Link
                        key={s}
                        href={`/search?category=${c.slug}&subcategory=${encodeURIComponent(s)}&type=classified`}
                        className="rounded-full bg-sand-50 px-2 py-0.5 text-[11px] font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {s} · {count}
                      </Link>
                    ))}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-2 mt-8 font-bold">Latest classifieds ({items.length})</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>

      <div className="card mt-8 bg-sand-50 p-5">
        <p className="font-bold">Selling something? It takes 3 minutes</p>
        <p className="mt-1 text-sm text-ink-500">Free for individuals: daylight photos, honest condition, fair KES price, your county and town. Moderation usually clears listings within hours.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/sell?type=classified" className="btn-primary">Post a free ad</Link>
          <Link href="/sellers" className="btn-secondary">Seller guidelines</Link>
        </div>
      </div>
    </div>
  );
}
