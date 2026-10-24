import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { getCategoryBySlug } from "@/lib/categories";
import { storeRead } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { breadcrumbJsonLd } from "@/lib/seo";
import { listingBreadcrumbs, listingKeywords, productSchema } from "@/lib/category-seo";

// Store previews are per-viewer (admin/owner only) — never statically cache.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "product").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (l) {
    const canonical = `https://chap.co.ke/product/${l.slug}`;
    const category = await getCategoryBySlug(l.categorySlug);
    return {
      title: l.title,
      description: l.description.slice(0, 160),
      keywords: listingKeywords(l, category ?? null),
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
  if (!resolved) return { title: "Product not found", robots: { index: false, follow: true } };
  const title = resolved.previewStatus ? `Preview: ${resolved.listing.title}` : resolved.listing.title;
  const canonical = `https://chap.co.ke/product/${resolved.listing.slug}`;
  const category = await getCategoryBySlug(resolved.listing.categorySlug);
  return {
    title,
    description: resolved.listing.description.slice(0, 160),
    keywords: listingKeywords(resolved.listing, category ?? null),
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

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { resolveSellerPhoto, resolveShopInfo, relatedWithLive } = await import("@/lib/live-listings");
  const hit = getListing(params.slug);
  if (hit) {
    const { main: l, fromOthers, fromSeller } = await relatedWithLive(hit);
    const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(l.sellerName), []);
    const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(l.id), []);
    const sellerPhotoUrl = await resolveSellerPhoto(l);
    const shopInfo = await resolveShopInfo(l.shopSlug);
    const { getSellerPlan } = await import("@/lib/plans");
    const sellerPlan = l.ownerId ? (await getSellerPlan(l.ownerId).catch(() => null))?.planId ?? null : null;
    const category = await getCategoryBySlug(l.categorySlug);
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        productSchema(l, category ?? null),
        breadcrumbJsonLd(listingBreadcrumbs(l, { name: "Browse", url: "/browse" }, category ?? null)),
      ],
    };
    return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} sellerPlan={sellerPlan} jsonLd={jsonLd} categoryName={category ? category.name : null} />;
  }
  // Seller-posted listing: `active` is public, anything else previews only
  // for admins / the owner / shop staff (banner inside ListingDetail).
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) notFound();
  const { previewStatus } = resolved;
  const { main: listing, fromOthers, fromSeller } = await relatedWithLive(resolved.listing);
  const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(listing.sellerName), []);
  const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(listing.id), []);
  const sellerPhotoUrl = await resolveSellerPhoto(listing);
  const shopInfo = await resolveShopInfo(listing.shopSlug);
  const { getSellerPlan: getPlan } = await import("@/lib/plans");
  const sellerPlan = listing.ownerId ? (await getPlan(listing.ownerId).catch(() => null))?.planId ?? null : null;
  const category = await getCategoryBySlug(listing.categorySlug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      productSchema(listing, category ?? null),
      breadcrumbJsonLd(listingBreadcrumbs(listing, { name: "Browse", url: "/browse" }, category ?? null)),
    ],
  };
  return <ListingDetail listing={listing} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} sellerPlan={sellerPlan} jsonLd={jsonLd} previewStatus={previewStatus} categoryName={category ? category.name : null} />;
}
