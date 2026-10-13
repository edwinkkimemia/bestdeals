import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { LISTINGS } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { resolveSellerProfile, getSellerListings, sellerSlug, withLiveVerification, resolveSellerContact } from "@/lib/live-listings";
import { ReviewsBlock } from "@/components/reviews-block";
import { ReviewForm } from "@/components/review-form";
import { ListingCard } from "@/components/ui/listing-card";
import { Badge } from "@/components/ui/badge";
import { ratingLabel } from "@/lib/ratings";
import { ShareRow } from "@/components/share-row";
import { breadcrumbJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  const names = [...new Set(LISTINGS.map((l) => l.sellerName))];
  return names.map((n) => ({ slug: sellerSlug(n) }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await resolveSellerProfile(params.slug);
  if (!p) return { title: "Seller not found" };
  return {
    title: `${p.name} — Seller on Chap`,
    description: `${p.businessName ? `${p.businessName} · ` : ""}${p.verified ? "Verified seller" : "Seller"} on Chap marketplace.`,
    alternates: { canonical: `https://chap.co.ke/seller/${params.slug}` },
  };
}

function memberSince(iso?: string): string {
  if (!iso) return "Chap seller";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "Chap seller";
  return `On Chap since ${d.toLocaleDateString("en-KE", { month: "short", year: "numeric" })}`;
}

export default async function SellerPage({ params }: { params: { slug: string } }) {
  const profile = await resolveSellerProfile(params.slug);
  if (!profile) notFound();

  const items = await getSellerListings(profile);
  const [byNameReviews, byBizReviews] = await Promise.all([
    storeRead((s) => s.listApprovedReviewsForSeller(profile.name), []),
    profile.businessName
      ? storeRead((s) => s.listApprovedReviewsForSeller(profile.businessName as string), [])
      : Promise.resolve([]),
  ]);
  const seen = new Set<string>();
  const reviews = [...byNameReviews, ...byBizReviews].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  const shops = profile.userId
    ? await storeRead((s) => s.listShopsByOwner(profile.userId as string), [])
    : [];
  const contact = resolveSellerContact(items, shops);
  const waText = encodeURIComponent(`Hello ${profile.name}! I found you on Chap and have a question.`);
  const liveItems = await withLiveVerification(items);

  return (
    <div className="container-bd py-6">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-black text-white">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {profile.name}{" "}
            {profile.verified ? <Badge tone="green">✓ Verified seller</Badge> : <Badge>Unverified seller</Badge>}
          </h1>
          <p className="text-sm text-ink-500">
            {profile.businessName ? `${profile.businessName} · ` : ""}
            {profile.sellerKind === "business" ? "Business seller" : "Individual seller"} · {memberSince(profile.memberSince)} ·{" "}
            {ratingLabel(reviews)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/search?q=${encodeURIComponent(profile.name)}`} className="btn-secondary">All listings</Link>
          {contact && (
            <>
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a>
              <a href={`https://wa.me/${contact.whatsapp}?text=${waText}`} target="_blank" rel="noopener" className="btn-secondary">WhatsApp</a>
            </>
          )}
          <Link href="/dashboard/messages/new" className="btn-primary"><MessageCircle className="h-4 w-4" /> Message seller</Link>
        </div>
      </div>
      <div className="mt-3">
        <ShareRow title={`${profile.name} on Chap`} text={`${profile.name} — seller on Chap marketplace`} />
      </div>
      {shops.length > 0 && (
        <>
          <h2 className="section-title mt-8">Shops ({shops.length})</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shops.map((s) => (
              <Link key={s.slug} href={`/shops/${s.slug}`} className="card p-4">
                <p className="font-bold">{s.name}</p>
                <p className="truncate text-sm text-ink-500">{s.businessCategory} · {s.town}, {s.county}</p>
                <p className="mt-1">{s.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}</p>
              </Link>
            ))}
          </div>
        </>
      )}
      <h2 className="section-title mt-8">Listings ({liveItems.length})</h2>
      {liveItems.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="font-bold">No live listings yet</p>
          <p className="mt-1 text-sm text-ink-500">New listings appear here once approved by moderation.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {liveItems.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
      <ReviewsBlock reviews={reviews} title={`Reviews for ${profile.name}`} />
      <ReviewForm sellerName={profile.name} />
    </div>
  );
}
