import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { breadcrumbJsonLd } from "@/lib/seo";

// Store previews are per-viewer (admin/owner only) — never statically cache.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "service").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (l) return { title: l.title, description: l.description.slice(0, 160) };
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) return { title: "Service not found" };
  return {
    title: resolved.previewStatus ? `Preview: ${resolved.listing.title}` : resolved.listing.title,
    description: resolved.listing.description.slice(0, 160),
    robots: resolved.previewStatus ? { index: false, follow: false } : undefined,
  };
}

export default async function ServiceDetail({ params }: { params: { slug: string } }) {
  const { resolveSellerPhoto, resolveShopInfo, relatedWithLive } = await import("@/lib/live-listings");
  const rawHit = getListing(params.slug);
  if (rawHit) {
    const { main: staticHit, fromOthers, fromSeller } = await relatedWithLive(rawHit);
    const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(staticHit.sellerName), []);
    const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(staticHit.id), []);
    const sellerPhotoUrl = await resolveSellerPhoto(staticHit);
    const shopInfo = await resolveShopInfo(staticHit.shopSlug);
    return <ListingDetail listing={staticHit} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} jsonLd={breadcrumbJsonLd([{ name: "Home", url: "https://chap.co.ke/" }, { name: "Services", url: "https://chap.co.ke/services" }, { name: staticHit.title, url: `https://chap.co.ke/services/${staticHit.slug}` }])} />;
  }
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) notFound();
  const { previewStatus } = resolved;
  const { main: l, fromOthers, fromSeller } = await relatedWithLive(resolved.listing);
  const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(l.sellerName), []);
  const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(l.id), []);
  const sellerPhotoUrl = await resolveSellerPhoto(l);
  const shopInfo = await resolveShopInfo(l.shopSlug);
  return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} jsonLd={breadcrumbJsonLd([{ name: "Home", url: "https://chap.co.ke/" }, { name: "Services", url: "https://chap.co.ke/services" }, { name: l.title, url: `https://chap.co.ke/services/${l.slug}` }])} previewStatus={previewStatus} />;
}
