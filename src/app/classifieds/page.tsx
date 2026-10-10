import Link from "next/link";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export const metadata = {
  title: "Classifieds — New & Pre-owned in Kenya",
  description: "Buy and sell new and second-hand goods person-to-person across Kenya. Enquire, negotiate, meet safely.",
};

export default function ClassifiedsIndex() {
  const items = LISTINGS.filter((l) => l.listingType === "classified");
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Classifieds" }]} />
      <h1 className="section-title mt-2">Classifieds</h1>
      <p className="text-sm text-ink-500">New & secondhand from individuals and businesses. Enquire, negotiate and meet safely — no checkout pressure.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/listings/new?type=classified" className="btn-primary">Post a free ad</Link>
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

      <h2 className="mb-2 mt-8 font-bold">Latest classifieds ({items.length})</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>

      <div className="card mt-8 bg-sand-50 p-5">
        <p className="font-bold">Selling something? It takes 3 minutes</p>
        <p className="mt-1 text-sm text-ink-500">Free for individuals: daylight photos, honest condition, fair KES price, your county and town. Moderation usually clears listings within hours.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/listings/new?type=classified" className="btn-primary">Post a free ad</Link>
          <Link href="/sellers" className="btn-secondary">Seller guidelines</Link>
        </div>
      </div>
    </div>
  );
}
