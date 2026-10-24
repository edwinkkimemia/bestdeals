import Link from "next/link";
import { LISTINGS } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";
import { StaticInfo } from "@/components/static-info";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { shuffleFeaturedFirst } from "@/lib/search";

export const metadata = {
  title: "Services across Kenya",
  description: "Find fundis, cleaners, tutors and professional services across Kenya. Compare coverage areas and request quotes.",
  keywords: ["services Kenya", "fundis Nairobi", "plumber Kenya", "cleaning services Kenya", "tutors Kenya", "chap.co.ke"],
  alternates: { canonical: "https://chap.co.ke/services" },
  openGraph: {
    type: "website",
    title: "Local services across Kenya",
    description: "Find fundis, cleaners, tutors and professional services across Kenya.",
    url: "https://chap.co.ke/services",
    siteName: "chap.co.ke",
    locale: "en_KE",
    images: [{ url: "/chaplogo.png", width: 1147, height: 287, alt: "chap.co.ke" }],
  },
  twitter: { card: "summary_large_image", title: "Local services across Kenya", description: "Find trusted fundis, cleaners, tutors and pros.", images: ["/chaplogo.png"] },
};

// Fresh order every visit: featured/promoted lead, the rest shuffle.
export const dynamic = "force-dynamic";

export default async function ServicesIndex() {
  const { getLiveStoreListings, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const live = (await getLiveStoreListings()).filter((l) => l.listingType === "service");
  const items = shuffleFeaturedFirst(
    await withLiveVerification(
      mergeStaticAndLive(
        LISTINGS.filter((l) => l.listingType === "service"),
        live
      )
    )
  );
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Services" }]} />
      <h1 className="section-title mt-2">Professional & local services</h1>
      <p className="text-sm text-ink-500">Fundis, cleaners, tutors and pros — compare coverage areas, price ranges and reviews, then request a quote.</p>

      <StaticInfo
        className="mt-4"
        numbered
        items={[
          { title: "Compare coverage", description: "Filter by county and check price ranges up front." },
          { title: "Request a quote", description: "Describe the job once; providers reply with written quotes." },
          { title: "Pay on results", description: "Agree scope and price, pay on completion, then review." },
        ]}
      />

      <h2 className="mb-2 mt-6 font-bold">Available services ({items.length})</h2>
      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-bold">No services listed yet in this view</p>
          <p className="mt-1 text-sm text-ink-500">Be the first pro here — listing a service is free.</p>
          <Link href="/sell?type=service" className="btn-primary mt-4">Offer a service</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/sell?type=service" className="btn-primary">Offer a service</Link>
        <Link href="/safety" className="btn-secondary">Hiring safely</Link>
      </div>
    </div>
  );
}
