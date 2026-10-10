import Link from "next/link";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

export const metadata = {
  title: "Services across Kenya",
  description: "Find fundis, cleaners, tutors and professional services across Kenya. Compare coverage areas and request quotes.",
};

export default function ServicesIndex() {
  const items = LISTINGS.filter((l) => l.listingType === "service");
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Services" }]} />
      <h1 className="section-title mt-2">Professional & local services</h1>
      <p className="text-sm text-ink-500">Fundis, cleaners, tutors and pros — compare coverage areas, price ranges and reviews, then request a quote.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "1. Compare coverage", d: "Each service lists where it operates — filter by your county and check price ranges up front." },
          { t: "2. Request a quote", d: "Describe the job once. Providers reply with written quotes before any work starts." },
          { t: "3. Pay on results", d: "Agree scope and price in writing, pay on completion, then review the provider for the next buyer." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/sell?type=service" className="btn-primary">Offer a service</Link>
        <Link href="/safety" className="btn-secondary">Hiring safely</Link>
      </div>

      <h2 className="mb-2 mt-8 font-bold">Available services ({items.length})</h2>
      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-bold">No services listed yet in this view</p>
          <p className="mt-1 text-sm text-ink-500">Be the first pro here — listing a service is free.</p>
          <Link href="/sell?type=service" className="btn-primary mt-4">Offer a service</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
