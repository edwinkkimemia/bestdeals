import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { breadcrumbJsonLd } from "@/lib/seo";
import { listingBreadcrumbs, listingKeywords, serviceSchema } from "@/lib/category-seo";

// Store previews are per-viewer (admin/owner only) — never statically cache.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "service").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (l) {
    const canonical = `https://chap.co.ke/services/${l.slug}`;
    return {
      title: l.title,
      description: l.description.slice(0, 160),
      keywords: listingKeywords(l),
      alternates: { canonical },
      openGraph: {
        type: "website",
        title: l.title,
        description: l.description.slice(0, 160),
        url: canonical,
        siteName: "chap.co.ke",
        locale: "en_KE",
        images: l.images[0] ? [{ url: l.images[0], alt: l.title }] : undefined,
      },
      twitter: { card: "summary_large_image", title: l.title, description: l.description.slice(0, 160), images: l.images[0] ? [l.images[0]] : undefined },
      robots: { index: true, follow: true },
    };
  }
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) return { title: "Service not found", robots: { index: false, follow: true } };
  const title = resolved.previewStatus ? `Preview: ${resolved.listing.title}` : resolved.listing.title;
  const canonical = `https://chap.co.ke/services/${resolved.listing.slug}`;
  return {
    title,
    description: resolved.listing.description.slice(0, 160),
    keywords: listingKeywords(resolved.listing),
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description: resolved.listing.description.slice(0, 160),
      url: canonical,
      siteName: "chap.co.ke",
      locale: "en_KE",
      images: resolved.listing.images[0] ? [{ url: resolved.listing.images[0], alt: resolved.listing.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description: resolved.listing.description.slice(0, 160), images: resolved.listing.images[0] ? [resolved.listing.images[0]] : undefined },
    robots: resolved.previewStatus ? { index: false, follow: false } : { index: true, follow: true },
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
    const { getSellerPlan } = await import("@/lib/plans");
    const sellerPlan = staticHit.ownerId ? (await getSellerPlan(staticHit.ownerId).catch(() => null))?.planId ?? null : null;
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        serviceSchema(staticHit),
        breadcrumbJsonLd(listingBreadcrumbs(staticHit, { name: "Services", url: "/services" })),
      ],
    };
    return <ListingDetail listing={staticHit} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} sellerPlan={sellerPlan} jsonLd={jsonLd} />;
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
  const { getSellerPlan: getPlan } = await import("@/lib/plans");
  const sellerPlan = l.ownerId ? (await getPlan(l.ownerId).catch(() => null))?.planId ?? null : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      serviceSchema(l),
      breadcrumbJsonLd(listingBreadcrumbs(l, { name: "Services", url: "/services" })),
    ],
  };
  return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} sellerPlan={sellerPlan} jsonLd={jsonLd} previewStatus={previewStatus} />;
}
