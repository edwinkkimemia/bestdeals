import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { SHOPS, getShop, shopListings } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { ReviewsBlock } from "@/components/reviews-block";
import { ReviewForm } from "@/components/review-form";
import { ListingCard } from "@/components/ui/listing-card";
import { Badge, PlanCheckmark, TenureBadge } from "@/components/ui/badge";
import { localBusinessJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { ratingLabel } from "@/lib/ratings";
import { ShareRow } from "@/components/share-row";
import { SafeImage } from "@/components/ui/safe-image";

// Shop catalogues change as sellers post and admins moderate — a static
// prerender would freeze them at build time and hide new products.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SHOPS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = getShop(params.slug);
  if (s) {
    // Twin wins for name/description so tab titles track admin/seller edits.
    // The cover doubles as the social share image.
    const twin = await storeRead((st) => st.getShopBySlug(params.slug), null);
    const name = (twin?.name ?? "").trim() || s.name;
    const description = (twin?.description ?? "").trim() || s.description;
    const cover = twin?.coverUrl || s.cover || undefined;
    return {
      title: `${name} — Shop on Chap`,
      description: description.slice(0, 160),
      keywords: [
        name,
        `${name} ${s.town}`,
        `${s.businessCategory} ${s.county}`,
        `shop in ${s.county}`,
        `buy from ${name}`,
        "chap.co.ke",
      ],
      alternates: { canonical: `https://chap.co.ke/shops/${s.slug}` },
      ...(cover ? { openGraph: { type: "website", title: `${name} — Shop on Chap`, description: description.slice(0, 160), url: `https://chap.co.ke/shops/${s.slug}`, siteName: "chap.co.ke", locale: "en_KE", images: [{ url: cover, alt: name }] } } : {}),
      twitter: { card: "summary_large_image", title: `${name} — Shop on Chap`, description: description.slice(0, 160), ...(cover ? { images: [cover] } : {}) },
      robots: { index: true, follow: true },
    };
  }
  // Seller-created shops live in the store, not the static catalogue —
  // check there before falling back to "not found" (fixes wrong tab title).
  const stored = await storeRead((st) => st.getShopBySlug(params.slug), null);
  if (!stored) return { title: "Shop not found" };
  const storedDescription = (stored.description || "").slice(0, 160);
  return {
    title: `${stored.name} — Shop on Chap`,
    description: storedDescription,
    keywords: [
      stored.name,
      `${stored.name} ${stored.town}`,
      `${stored.businessCategory} ${stored.county}`,
      `shop in ${stored.county}`,
      `buy from ${stored.name}`,
      "chap.co.ke",
    ],
    alternates: { canonical: `https://chap.co.ke/shops/${stored.slug}` },
    ...(stored.coverUrl ? { openGraph: { type: "website", title: `${stored.name} — Shop on Chap`, description: storedDescription, url: `https://chap.co.ke/shops/${stored.slug}`, siteName: "chap.co.ke", locale: "en_KE", images: [{ url: stored.coverUrl, alt: stored.name }] } } : {}),
    twitter: { card: "summary_large_image", title: `${stored.name} — Shop on Chap`, description: storedDescription, ...(stored.coverUrl ? { images: [stored.coverUrl] } : {}) },
    robots: { index: true, follow: true },
  };
}

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const s = getShop(params.slug);
  if (!s) {
    // Seller-created shop from the store (skipped if the DB is unreachable).
    const stored = await storeRead((st) => st.getShopBySlug(params.slug), null);
    if (!stored) notFound();
    const nonNull = stored as NonNullable<typeof stored>;
    const storedReviews = await storeRead((st) => st.listApprovedReviewsForShop(nonNull.slug), []);
    // Shop identity only here: the owner's personal profile (name/photo)
    // conflicts with the shop/brand identity, so it stays in the dashboard.
    // Approved catalogue for this shop — previously never fetched, so
    // seller products looked "not live" even after admin approval.
    const { getLiveShopListings } = await import("@/lib/live-listings");
    const catalogue = await getLiveShopListings(nonNull.slug);
    const storedJsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        localBusinessJsonLd({
          name: nonNull.name,
          description: nonNull.description,
          url: `https://chap.co.ke/shops/${nonNull.slug}`,
          phone: nonNull.phone,
          area: `${nonNull.town}, ${nonNull.county}`,
          image: nonNull.coverUrl ?? undefined,
          logo: nonNull.logoUrl ?? undefined,
          town: nonNull.town,
          county: nonNull.county,
          hours: nonNull.hours ?? undefined,
        }),
        breadcrumbJsonLd([
          { name: "Home", url: "https://chap.co.ke/" },
          { name: "Shops", url: "https://chap.co.ke/shops" },
          { name: nonNull.name, url: `https://chap.co.ke/shops/${nonNull.slug}` },
        ]),
      ],
    };
    return (
      <div>
        <div aria-hidden className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 sm:h-44">
          {nonNull.coverUrl && (
            <SafeImage src={nonNull.coverUrl} alt={`${nonNull.name} cover`} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="container-bd py-6">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storedJsonLd) }} />
          <div className="card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-5 lg:flex lg:flex-row lg:gap-4">
            <span className="col-start-1 row-start-1 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-2xl font-black text-white">
              {nonNull.logoUrl ? (
                <SafeImage src={nonNull.logoUrl} alt={`${nonNull.name} logo`} className="h-full w-full object-cover" fallback={nonNull.name.charAt(0).toUpperCase()} />
              ) : (
                nonNull.name.charAt(0).toUpperCase()
              )}
            </span>
            <div className="contents lg:block lg:min-w-0 lg:flex-1">
              <h1 className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-2 text-2xl font-bold">{nonNull.name} <PlanCheckmark plan={nonNull.planId} /> {nonNull.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>} <TenureBadge since={nonNull.createdAt} /></h1>
              <p className="col-span-2 text-sm text-ink-500">{nonNull.businessCategory} · {nonNull.town}, {nonNull.county} · {ratingLabel(storedReviews)}{nonNull.hours ? ` · 🕒 ${nonNull.hours}` : ""}</p>
              <p className="col-span-2 mt-1 text-sm">{nonNull.description}</p>
            </div>
            <div className="col-span-2 flex flex-wrap gap-2 lg:col-auto">
              <a href={`tel:${nonNull.phone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a>
              <a href={`https://wa.me/${nonNull.phone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello ${nonNull.name}! I found your shop on Chap.`)}`} target="_blank" rel="noopener" className="btn-whatsapp"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
              <Link href={`/dashboard/messages/new?shop=${nonNull.slug}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> Message shop</Link>
            </div>
          </div>
          <div className="mt-3"><ShareRow title={`${nonNull.name} on Chap`} text={`${nonNull.name} — ${nonNull.businessCategory} in ${nonNull.town}, ${nonNull.county}`} /></div>
          <h2 className="section-title mt-8">Catalogue ({catalogue.length})</h2>
          {catalogue.length === 0 ? (
            <div className="card mt-4 p-6 text-center">
              <p className="font-bold">No live products yet</p>
              <p className="mt-1 text-sm text-ink-500">
                New listings appear here once approved by moderation. Pending or rejected items stay visible only in the seller dashboard.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {catalogue.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
          <ReviewsBlock reviews={storedReviews} title={`Reviews for ${nonNull.name}`} />
          <ReviewForm shopSlug={nonNull.slug} sellerName={nonNull.name} />
        </div>
      </div>
    );
  }
  const staticItems = shopListings(s.slug);
  const { getLiveShopListings: getLiveForStatic, mergeStaticAndLive, withLiveVerification } = await import("@/lib/live-listings");
  const liveForShop = await getLiveForStatic(s.slug);
  // Stamp the merged catalogue so static rows carry live plan/verified flags for card checkmarks.
  const items = await withLiveVerification(mergeStaticAndLive(staticItems, liveForShop));
  const reviews = await storeRead((st) => st.listApprovedReviewsForShop(s.slug), []);
  // Seller-managed header + verification live on the store twin (seeded
  // shops have one) — the catalogue copy is frozen, so the twin wins or the
  // storefront shows stale badges/logos after admin verification or edits.
  const contacts = await storeRead((st) => st.getShopBySlug(s.slug), null);
  const { mergeShopDisplay } = await import("@/lib/live-listings");
  const v = mergeShopDisplay(
    {
      slug: s.slug, name: s.name, description: s.description,
      businessCategory: s.businessCategory, county: s.county, town: s.town,
      phone: s.phone, logo: s.logo, cover: s.cover, verified: s.verified,
      deliveryInfo: s.deliveryInfo, hours: s.hours, planId: "free",
    },
    contacts
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      localBusinessJsonLd({
        name: v.name,
        description: v.description,
        url: `https://chap.co.ke/shops/${v.slug}`,
        phone: v.phone,
        area: `${v.town}, ${v.county}`,
        image: v.cover ?? undefined,
        logo: v.logo ?? undefined,
        town: v.town,
        county: v.county,
        hours: v.hours || undefined,
      }),
      breadcrumbJsonLd([{ name: "Home", url: "https://chap.co.ke/" }, { name: "Shops", url: "https://chap.co.ke/shops" }, { name: v.name, url: `https://chap.co.ke/shops/${v.slug}` }]),
    ],
  };
  return (
    <div>
      <div aria-hidden className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 sm:h-44">
        {v.cover && <SafeImage src={v.cover} alt={`${v.name} cover`} className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <div className="container-bd py-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-5 lg:flex lg:flex-row lg:gap-4">
          {v.logo ? (
            <SafeImage src={v.logo} alt={`${v.name} logo`} className="col-start-1 row-start-1 h-16 w-16 rounded-xl object-cover" fallback={v.name.charAt(0).toUpperCase()} />
          ) : (
            <span aria-hidden className="col-start-1 row-start-1 flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-2xl font-black text-white">
              {v.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="contents lg:block lg:min-w-0 lg:flex-1">
            <h1 className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-2 text-2xl font-bold">{v.name} <PlanCheckmark plan={v.planId} /> {v.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}</h1>
            <p className="col-span-2 text-sm text-ink-500">{v.businessCategory} · {v.town}, {v.county} · {ratingLabel(reviews)}{v.hours ? ` · 🕒 ${v.hours}` : ""}</p>
            <p className="col-span-2 mt-1 text-sm">{v.description}</p>
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 lg:col-auto">
            <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a>
            <a href={`https://wa.me/${v.phone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello ${v.name}! I found your shop on Chap.`)}`} target="_blank" rel="noopener" className="btn-whatsapp"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
            <Link href={`/dashboard/messages/new?shop=${v.slug}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> Message shop</Link>
          </div>
        </div>
        <div className="mt-3"><ShareRow title={`${v.name} on Chap`} text={`${v.name} — ${v.businessCategory} in ${v.town}, ${v.county}`} /></div>
        <h2 className="section-title mt-8">Catalogue ({items.length})</h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
        <ReviewsBlock reviews={reviews} title={`Reviews for ${v.name}`} />
        <ReviewForm shopSlug={v.slug} sellerName={v.name} />
      </div>
    </div>
  );
}
