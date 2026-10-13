import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { getRelated } from "@/lib/related";
import { storeRead } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { breadcrumbJsonLd } from "@/lib/seo";

// Store previews are per-viewer (admin/owner only) — never statically cache.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "classified").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (l) {
    return {
      title: l.title,
      description: l.description.slice(0, 160),
      alternates: { canonical: `https://chap.co.ke/classifieds/${l.slug}` },
      openGraph: { title: l.title, images: [l.images[0]] },
    };
  }
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) return { title: "Listing not found" };
  return {
    title: resolved.previewStatus ? `Preview: ${resolved.listing.title}` : resolved.listing.title,
    description: resolved.listing.description.slice(0, 160),
    alternates: { canonical: `https://chap.co.ke/classifieds/${resolved.listing.slug}` },
    openGraph: { title: resolved.listing.title, images: [resolved.listing.images[0]] },
    robots: resolved.previewStatus ? { index: false, follow: false } : undefined,
  };
}

export default async function ClassifiedDetail({ params }: { params: { slug: string } }) {
  const { resolveSellerPhoto, resolveShopInfo } = await import("@/lib/live-listings");
  const staticHit = getListing(params.slug);
  if (staticHit) {
    const { fromOthers, fromSeller } = getRelated(staticHit);
    const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(staticHit.sellerName), []);
    const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(staticHit.id), []);
    const sellerPhotoUrl = await resolveSellerPhoto(staticHit);
    const shopInfo = await resolveShopInfo(staticHit.shopSlug);
    const jsonLd = breadcrumbJsonLd([
      { name: "Home", url: "https://chap.co.ke/" },
      { name: "Classifieds", url: "https://chap.co.ke/classifieds" },
      { name: staticHit.title, url: `https://chap.co.ke/classifieds/${staticHit.slug}` },
    ]);
    return <ListingDetail listing={staticHit} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} jsonLd={jsonLd} />;
  }
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) notFound();
  const { listing: l, previewStatus } = resolved as NonNullable<typeof resolved>;
  const { fromOthers, fromSeller } = getRelated(l);
  const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(l.sellerName), []);
  const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(l.id), []);
  const sellerPhotoUrl = await resolveSellerPhoto(l);
  const shopInfo = await resolveShopInfo(l.shopSlug);
  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: "https://chap.co.ke/" },
    { name: "Classifieds", url: "https://chap.co.ke/classifieds" },
    { name: l.title, url: `https://chap.co.ke/classifieds/${l.slug}` },
  ]);
  return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} jsonLd={jsonLd} previewStatus={previewStatus} />;
}
