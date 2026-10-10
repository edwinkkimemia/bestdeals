import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/data/catalog";
import { getRelated } from "@/lib/related";
import { getStore } from "@/lib/store";
import { ListingDetail } from "@/components/listing-detail";
import { breadcrumbJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return LISTINGS.filter((l) => l.listingType === "service").map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const l = getListing(params.slug);
  if (!l) return { title: "Service not found" };
  return { title: l.title, description: l.description.slice(0, 160) };
}

export default async function ServiceDetail({ params }: { params: { slug: string } }) {
  const l = getListing(params.slug);
  if (!l) notFound();
  const { fromOthers, fromSeller } = getRelated(l);
  const reviews = await getStore().listApprovedReviewsForSeller(l.sellerName);
  return <ListingDetail listing={l} related={fromOthers} moreFromSeller={fromSeller} reviews={reviews} jsonLd={breadcrumbJsonLd([{ name: "Home", url: "https://chap.co.ke/" }, { name: "Services", url: "https://chap.co.ke/services" }, { name: l.title, url: `https://chap.co.ke/services/${l.slug}` }])} />;
}
