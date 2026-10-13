import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { getRelated } from "@/lib/related";
import { storeRead } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/seo";

// Store previews are per-viewer (admin/owner only) — never statically cache.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "product").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (l) {
    return {
      title: l.title,
      description: l.description.slice(0, 160),
      alternates: { canonical: `https://chap.co.ke/product/${l.slug}` },
      openGraph: { title: l.title, description: l.description.slice(0, 160), images: [l.images[0]] },
    };
  }
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) return { title: "Product not found" };
  return {
    title: resolved.previewStatus ? `Preview: ${resolved.listing.title}` : resolved.listing.title,
    description: resolved.listing.description.slice(0, 160),
    alternates: { canonical: `https://chap.co.ke/product/${resolved.listing.slug}` },
    openGraph: { title: resolved.listing.title, description: resolved.listing.description.slice(0, 160), images: [resolved.listing.images[0]] },
    robots: resolved.previewStatus ? { index: false, follow: false } : undefined,
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { resolveSellerPhoto, resolveShopInfo } = await import("@/lib/live-listings");
  const l = getListing(params.slug);
  if (l) {
    const { fromOthers, fromSeller } = getRelated(l);
    const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(l.sellerName), []);
    const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(l.id), []);
    const sellerPhotoUrl = await resolveSellerPhoto(l);
    const shopInfo = await resolveShopInfo(l.shopSlug);
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        productJsonLd({ name: l.title, description: l.description, image: l.images, price: l.price, url: `https://chap.co.ke/product/${l.slug}` }),
        breadcrumbJsonLd([
          { name: "Home", url: "https://chap.co.ke/" },
          { name: "Shop", url: "https://chap.co.ke/shop" },
          { name: l.title, url: `https://chap.co.ke/product/${l.slug}` },
        ]),
      ],
    };
    return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} jsonLd={jsonLd} />;
  }
  // Seller-posted listing: `active` is public, anything else previews only
  // for admins / the owner / shop staff (banner inside ListingDetail).
  const { resolveStoreDetail } = await import("@/lib/live-listings");
  const resolved = await resolveStoreDetail(params.slug);
  if (!resolved) notFound();
  const { listing, previewStatus } = resolved as NonNullable<typeof resolved>;
  const { fromOthers, fromSeller } = getRelated(listing);
  const reviews = await storeRead((s) => s.listApprovedReviewsForSeller(listing.sellerName), []);
  const listingReviews = await storeRead((s) => s.listApprovedReviewsForListing(listing.id), []);
  const sellerPhotoUrl = await resolveSellerPhoto(listing);
  const shopInfo = await resolveShopInfo(listing.shopSlug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      productJsonLd({ name: listing.title, description: listing.description, image: listing.images, price: listing.price, url: `https://chap.co.ke/product/${listing.slug}` }),
      breadcrumbJsonLd([
        { name: "Home", url: "https://chap.co.ke/" },
        { name: "Shop", url: "https://chap.co.ke/shop" },
        { name: listing.title, url: `https://chap.co.ke/product/${listing.slug}` },
      ]),
    ],
  };
  return <ListingDetail listing={listing} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} listingReviews={listingReviews} sellerPhotoUrl={sellerPhotoUrl} shopInfo={shopInfo} jsonLd={jsonLd} previewStatus={previewStatus} />;
}
