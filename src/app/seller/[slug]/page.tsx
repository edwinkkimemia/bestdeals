import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { LISTINGS } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { resolveSellerProfile, getSellerListings, sellerSlug, withLiveVerification, resolveSellerContact } from "@/lib/live-listings";
import { ReviewsBlock } from "@/components/reviews-block";
import { ReviewForm } from "@/components/review-form";
import { ListingCard } from "@/components/ui/listing-card";
import { Badge, PlanCheckmark } from "@/components/ui/badge";
import { ratingLabel } from "@/lib/ratings";
import { ShareRow } from "@/components/share-row";
import { SafeImage } from "@/components/ui/safe-image";
import { breadcrumbJsonLd } from "@/lib/seo";

// Seller catalogues change as sellers post and admins moderate — a static
// prerender would freeze them at build time and hide new products.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  const names = [...new Set(LISTINGS.map((l) => l.sellerName))];
  return names.map((n) => ({ slug: sellerSlug(n) }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await resolveSellerProfile(params.slug);
  if (!p) return { title: "Seller not found" };
  // The seller's own bio is the description; the cover doubles as the social
  // share image (falls back to the profile photo).
  const description = (p.bio ?? "").trim() || `${p.businessName ? `${p.businessName} · ` : ""}${p.verified ? "Verified seller" : "Seller"} on Chap marketplace.`;
  const shareImage = p.coverUrl || p.photoUrl || undefined;
  return {
    title: `${p.name} — Seller on Chap`,
    description: description.slice(0, 160),
    alternates: { canonical: `https://chap.co.ke/seller/${params.slug}` },
    ...(shareImage ? { openGraph: { title: `${p.name} — Seller on Chap`, description: description.slice(0, 160), images: [shareImage] } } : {}),
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
  const { getSellerPlan } = await import("@/lib/plans");
  const sellerPlan = profile.userId ? (await getSellerPlan(profile.userId).catch(() => null)) : null;

  return (
    <div>
      <div aria-hidden className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 sm:h-44">
        {profile.coverUrl && (
          <SafeImage src={profile.coverUrl} alt={`${profile.name} cover`} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="container-bd py-6">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-black text-white">
          {profile.photoUrl ? (
            <SafeImage src={profile.photoUrl} alt="" className="h-full w-full object-cover" fallback={profile.name.charAt(0).toUpperCase()} />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {profile.name}
            <PlanCheckmark plan={sellerPlan?.planId} />
            {profile.verified ? <Badge tone="green">✓ Verified seller</Badge> : <Badge>Unverified seller</Badge>}
          </h1>
          <p className="text-sm text-ink-500">
            {profile.businessName ? `${profile.businessName} · ` : ""}
            {profile.sellerKind === "business" ? "Business seller" : "Individual seller"} · {memberSince(profile.memberSince)} ·{" "}
            {ratingLabel(reviews)}
          </p>
          {profile.bio && <p className="mt-1 text-sm">{profile.bio}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/search?q=${encodeURIComponent(profile.name)}`} className="btn-secondary">All listings</Link>
          {contact && (
            <>
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a>
              <a href={`https://wa.me/${contact.whatsapp}?text=${waText}`} target="_blank" rel="noopener" className="btn-whatsapp"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
            </>
          )}
          <Link href={profile.userId ? `/dashboard/messages/new?user=${profile.userId}` : "/dashboard/messages/new"} className="btn-primary"><MessageCircle className="h-4 w-4" /> Message seller</Link>
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
                <p className="flex flex-wrap items-center gap-1.5 font-bold">{s.name} <PlanCheckmark plan={s.planId} size="sm" /></p>
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
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {liveItems.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
      <ReviewsBlock reviews={reviews} title={`Reviews for ${profile.name}`} />
      <ReviewForm sellerName={profile.name} />
      </div>
    </div>
  );
}
