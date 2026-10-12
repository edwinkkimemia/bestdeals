import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SHOPS, getShop, shopListings } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { ReviewsBlock } from "@/components/reviews-block";
import { ListingCard } from "@/components/ui/listing-card";
import { Badge } from "@/components/ui/badge";
import { localBusinessJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { ratingLabel } from "@/lib/ratings";
import { ShareRow } from "@/components/share-row";

export function generateStaticParams() {
  return SHOPS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = getShop(params.slug);
  if (!s) return { title: "Shop not found" };
  return {
    title: `${s.name} — Shop on Chap`,
    description: s.description.slice(0, 160),
    alternates: { canonical: `https://chap.co.ke/shops/${s.slug}` },
  };
}

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const s = getShop(params.slug);
  if (!s) {
    // Seller-created shop from the store (skipped if the DB is unreachable).
    const stored = await storeRead((st) => st.getShopBySlug(params.slug), null);
    if (!stored) notFound();
    const storedReviews = await storeRead((st) => st.listApprovedReviewsForShop(stored.slug), []);
    const owner = stored.ownerId
      ? await storeRead((st) => st.findUserById(stored.ownerId as string), null)
      : null;
    return (
      <div>
        {stored.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stored.coverUrl} alt={`${stored.name} cover`} className="h-48 w-full object-cover sm:h-64" />
        ) : (
          <div aria-hidden className="h-32 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 sm:h-44" />
        )}
        <div className="container-bd py-6">
          <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-2xl font-black text-white">
              {stored.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stored.logoUrl} alt={`${stored.name} logo`} className="h-full w-full object-cover" />
              ) : (
                stored.name.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{stored.name} {stored.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}</h1>
              <p className="text-sm text-ink-500">{stored.businessCategory} · {stored.town}, {stored.county} · {ratingLabel(storedReviews)}{stored.hours ? ` · 🕒 ${stored.hours}` : ""}</p>
              <p className="mt-1 text-sm">{stored.description}</p>
              {owner && (
                <p className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                  <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-sand-100 font-bold text-ink-700">
                    {owner.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={owner.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      owner.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  Shop owner: <strong className="text-ink-700">{owner.name}</strong>
                  {owner.verified && <Badge tone="green">✓</Badge>}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/search?q=${encodeURIComponent(stored.name)}`} className="btn-secondary">All products</Link>
              <Link href={`/dashboard/messages/new?shop=${stored.slug}`} className="btn-primary">Bulk enquiry</Link>
            </div>
          </div>
          <div className="mt-3"><ShareRow title={`${stored.name} on Chap`} text={`${stored.name} — ${stored.businessCategory} in ${stored.town}, ${stored.county}`} /></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="card p-4 text-sm"><p className="font-bold">Delivery</p><p className="text-ink-500">{stored.deliveryInfo || "Delivery arranged with the shop — confirm fee and timeline before paying."}</p></div>
            <div className="card p-4 text-sm"><p className="font-bold">Contact</p><p className="text-ink-500">{stored.phone} · {stored.town}, {stored.county}</p></div>
            <div className="card p-4 text-sm"><p className="font-bold">Policies</p><p className="text-ink-500">Bulk quotes within 24h. Inspect before paying.</p></div>
          </div>
          <ReviewsBlock reviews={storedReviews} title={`Reviews for ${stored.name}`} />
        </div>
      </div>
    );
  }
  const items = shopListings(s.slug);
  const reviews = await storeRead((st) => st.listApprovedReviewsForShop(s.slug), []);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      localBusinessJsonLd({ name: s.name, description: s.description, url: `https://chap.co.ke/shops/${s.slug}`, phone: s.phone, area: `${s.town}, ${s.county}` }),
      breadcrumbJsonLd([{ name: "Home", url: "https://chap.co.ke/" }, { name: "Shops", url: "https://chap.co.ke/shops" }, { name: s.name, url: `https://chap.co.ke/shops/${s.slug}` }]),
    ],
  };
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.cover} alt={`${s.name} cover`} className="h-48 w-full object-cover sm:h-64" />
      <div className="container-bd py-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.logo} alt={`${s.name} logo`} className="h-16 w-16 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{s.name} {s.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}</h1>
            <p className="text-sm text-ink-500">{s.businessCategory} · {s.town}, {s.county} · {ratingLabel(reviews)} · 🕒 {s.hours}</p>
            <p className="mt-1 text-sm">{s.description}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/search?q=${encodeURIComponent(s.name)}`} className="btn-secondary">All products</Link>
            <Link href={`/dashboard/messages/new?shop=${s.slug}`} className="btn-primary">Bulk enquiry</Link>
          </div>
        </div>
        <div className="mt-3"><ShareRow title={`${s.name} on Chap`} text={`${s.name} — ${s.businessCategory} in ${s.town}, ${s.county}`} /></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="card p-4 text-sm"><p className="font-bold">Delivery</p><p className="text-ink-500">{s.deliveryInfo}</p></div>
          <div className="card p-4 text-sm"><p className="font-bold">Contact</p><p className="text-ink-500">{s.phone} · {s.town}, {s.county}</p></div>
          <div className="card p-4 text-sm"><p className="font-bold">Policies</p><p className="text-ink-500">7-day returns on sealed electronics. Bulk quotes within 24h.</p></div>
        </div>
        <h2 className="section-title mt-8">Catalogue ({items.length})</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
        <ReviewsBlock reviews={reviews} title={`Reviews for ${s.name}`} />
      </div>
    </div>
  );
}
