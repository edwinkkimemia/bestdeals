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
import { Badge, PlanCheckmark } from "@/components/ui/badge";
import { localBusinessJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { ratingLabel } from "@/lib/ratings";
import { ShareRow } from "@/components/share-row";
import { SafeImage } from "@/components/ui/safe-image";

// Shop catalogues change as sellers post and admins moderate — a static
// prerender would freeze them at build time and hide new products.
export const dynamic = "force-dynamic";

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** Seller-managed social profile pills (website/email render alongside). */
function SocialLinks({ socials }: { socials?: Record<string, string> | null }) {
  const entries = Object.entries(socials ?? {}).filter(([, v]) => typeof v === "string" && v.trim());
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <a key={k} href={v} target="_blank" rel="noopener" className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold hover:bg-sand-50">
          {SOCIAL_LABELS[k] ?? k}
        </a>
      ))}
    </div>
  );
}

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
      alternates: { canonical: `https://chap.co.ke/shops/${s.slug}` },
      ...(cover ? { openGraph: { title: `${name} — Shop on Chap`, description: description.slice(0, 160), images: [cover] } } : {}),
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
    alternates: { canonical: `https://chap.co.ke/shops/${stored.slug}` },
    ...(stored.coverUrl ? { openGraph: { title: `${stored.name} — Shop on Chap`, description: storedDescription, images: [stored.coverUrl] } } : {}),
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
    return (
      <div>
        <div aria-hidden className="relative h-32 w-full overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 sm:h-44">
          {nonNull.coverUrl && (
            <SafeImage src={nonNull.coverUrl} alt={`${nonNull.name} cover`} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="container-bd py-6">
          <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-2xl font-black text-white">
              {nonNull.logoUrl ? (
                <SafeImage src={nonNull.logoUrl} alt={`${nonNull.name} logo`} className="h-full w-full object-cover" fallback={nonNull.name.charAt(0).toUpperCase()} />
              ) : (
                nonNull.name.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{nonNull.name} <PlanCheckmark plan={nonNull.planId} /> {nonNull.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}</h1>
              <p className="text-sm text-ink-500">{nonNull.businessCategory} · {nonNull.town}, {nonNull.county} · {ratingLabel(storedReviews)}{nonNull.hours ? ` · 🕒 ${nonNull.hours}` : ""}</p>
              <p className="mt-1 text-sm">{nonNull.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/search?q=${encodeURIComponent(nonNull.name)}`} className="btn-secondary">All products</Link>
              <a href={`tel:${nonNull.phone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a>
              <a href={`https://wa.me/${nonNull.phone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello ${nonNull.name}! I found your shop on Chap.`)}`} target="_blank" rel="noopener" className="btn-whatsapp"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
              <Link href={`/dashboard/messages/new?shop=${nonNull.slug}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> Message shop</Link>
            </div>
          </div>
          <div className="mt-3"><ShareRow title={`${nonNull.name} on Chap`} text={`${nonNull.name} — ${nonNull.businessCategory} in ${nonNull.town}, ${nonNull.county}`} /></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="card p-4 text-sm"><p className="font-bold">Delivery</p><p className="text-ink-500">{nonNull.deliveryInfo || "Delivery arranged with the shop — confirm fee and timeline before paying."}</p></div>
            <div className="card p-4 text-sm">
              <p className="font-bold">Contact</p>
              <p className="text-ink-500">{nonNull.phone} · {nonNull.town}, {nonNull.county}</p>
              {nonNull.website && <p className="mt-1"><a href={nonNull.website} target="_blank" rel="noopener" className="link-bd break-all">{nonNull.website.replace(/^https?:\/\//, "")}</a></p>}
              {nonNull.email && <p className="mt-1"><a href={`mailto:${nonNull.email}`} className="link-bd break-all">{nonNull.email}</a></p>}
              <SocialLinks socials={nonNull.socials} />
            </div>
            <div className="card p-4 text-sm"><p className="font-bold">Policies</p><p className="text-ink-500">Bulk quotes within 24h. Inspect before paying.</p></div>
          </div>
          <h2 className="section-title mt-8">Catalogue ({catalogue.length})</h2>
          {catalogue.length === 0 ? (
            <div className="card mt-4 p-6 text-center">
              <p className="font-bold">No live products yet</p>
              <p className="mt-1 text-sm text-ink-500">
                New listings appear here once approved by moderation. Pending or rejected items stay visible only in the seller dashboard.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
  const { getLiveShopListings: getLiveForStatic, mergeStaticAndLive } = await import("@/lib/live-listings");
  const liveForShop = await getLiveForStatic(s.slug);
  const items = mergeStaticAndLive(staticItems, liveForShop);
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
      localBusinessJsonLd({ name: v.name, description: v.description, url: `https://chap.co.ke/shops/${v.slug}`, phone: v.phone, area: `${v.town}, ${v.county}` }),
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
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          {v.logo ? (
            <SafeImage src={v.logo} alt={`${v.name} logo`} className="h-16 w-16 rounded-xl object-cover" fallback={v.name.charAt(0).toUpperCase()} />
          ) : (
            <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-2xl font-black text-white">
              {v.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{v.name} <PlanCheckmark plan={v.planId} /> {v.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}</h1>
            <p className="text-sm text-ink-500">{v.businessCategory} · {v.town}, {v.county} · {ratingLabel(reviews)}{v.hours ? ` · 🕒 ${v.hours}` : ""}</p>
            <p className="mt-1 text-sm">{v.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/search?q=${encodeURIComponent(v.name)}`} className="btn-secondary">All products</Link>
            <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a>
            <a href={`https://wa.me/${v.phone.replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(`Hello ${v.name}! I found your shop on Chap.`)}`} target="_blank" rel="noopener" className="btn-whatsapp"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
            <Link href={`/dashboard/messages/new?shop=${v.slug}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> Message shop</Link>
          </div>
        </div>
        <div className="mt-3"><ShareRow title={`${v.name} on Chap`} text={`${v.name} — ${v.businessCategory} in ${v.town}, ${v.county}`} /></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="card p-4 text-sm"><p className="font-bold">Delivery</p><p className="text-ink-500">{v.deliveryInfo}</p></div>
          <div className="card p-4 text-sm">
            <p className="font-bold">Contact</p>
            <p className="text-ink-500">{v.phone} · {v.town}, {v.county}</p>
            {contacts?.website && <p className="mt-1"><a href={contacts.website} target="_blank" rel="noopener" className="link-bd break-all">{contacts.website.replace(/^https?:\/\//, "")}</a></p>}
            {contacts?.email && <p className="mt-1"><a href={`mailto:${contacts.email}`} className="link-bd break-all">{contacts.email}</a></p>}
            <SocialLinks socials={contacts?.socials} />
          </div>
          <div className="card p-4 text-sm"><p className="font-bold">Policies</p><p className="text-ink-500">7-day returns on sealed electronics. Bulk quotes within 24h.</p></div>
        </div>
        <h2 className="section-title mt-8">Catalogue ({items.length})</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
        <ReviewsBlock reviews={reviews} title={`Reviews for ${v.name}`} />
        <ReviewForm shopSlug={v.slug} sellerName={v.name} />
      </div>
    </div>
  );
}
