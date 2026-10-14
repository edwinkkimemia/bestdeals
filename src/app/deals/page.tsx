import Link from "next/link";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Today's Best Deals",
  description: "Genuine price drops from verified prices across Kenya — no fake countdowns or invented discounts.",
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const liveDeals = (await getLiveStoreListings()).filter((l) => l.compareAt && l.compareAt > l.price);
  const deals = shuffleFeaturedFirst(
    await withLiveVerification(
      mergeStaticAndLive(
        LISTINGS.filter((l) => l.compareAt && l.compareAt > l.price),
        liveDeals
      )
    )
  );
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Best Deals" }]} />
      <h1 className="section-title mt-2">Today&apos;s Best Deals</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        Real savings from verified sellers across Kenya. Every deal shows a genuine previous
        price with the saving calculated from it — never fake countdowns or invented discounts.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Genuine before-prices", d: "A 'was' price only appears if the item truly sold at it. Our moderators remove fabricated discounts." },
          { t: "Verified sellers first", d: "Deal rails prioritise checked sellers with real stock — availability is re-validated at checkout." },
          { t: "Compare before you buy", d: "Open any deal to see the same item from other sellers and classifieds side by side." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      {deals.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-bold">No live deals right now</p>
          <p className="mt-1 text-sm text-ink-500">New price drops land daily — browse the marketplace or check back tomorrow.</p>
          <Link href="/shop" className="btn-primary mt-4">Browse Shop</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {deals.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <div className="card mt-8 bg-sand-50 p-5">
        <p className="font-bold">Selling? Put your price drop here</p>
        <p className="mt-1 text-sm text-ink-500">Genuine reductions on active listings surface automatically in this rail after moderation. No fees, no tricks.</p>
        <Link href="/sell" className="btn-primary mt-3">List an item</Link>
      </div>
    </div>
  );
}
