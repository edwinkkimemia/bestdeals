import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { getRelated } from "@/lib/related";
import { getStore } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { breadcrumbJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "classified").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (!l) return { title: "Listing not found" };
  return {
    title: l.title,
    description: l.description.slice(0, 160),
    alternates: { canonical: `https://chap.co.ke/classifieds/${l.slug}` },
    openGraph: { title: l.title, images: [l.images[0]] },
  };
}

export default async function ClassifiedDetail({ params }: { params: { slug: string } }) {
  const l = getListing(params.slug);
  if (!l) notFound();
  const { fromOthers, fromSeller } = getRelated(l);
  const reviews = await getStore().listApprovedReviewsForSeller(l.sellerName);
  const jsonLd = breadcrumbJsonLd([
    { name: "Home", url: "https://chap.co.ke/" },
    { name: "Classifieds", url: "https://chap.co.ke/classifieds" },
    { name: l.title, url: `https://chap.co.ke/classifieds/${l.slug}` },
  ]);
  return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} jsonLd={jsonLd} />;
}
