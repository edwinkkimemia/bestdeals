"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Share2, MessageCircle } from "lucide-react";
import { formatKES } from "@/lib/format";
import type { Listing } from "@/data/catalog";
import { listingHref } from "@/lib/related";
import type { ReviewRecord } from "@/lib/store";
import { ReviewsBlock } from "./reviews-block";
import { Badge, ConditionBadge, VerifiedBadge } from "@/components/ui/badge";
import { Price } from "@/components/ui/listing-card";
import { useCart } from "@/components/cart-provider";
import { WishlistButton } from "@/components/ui/wishlist-button";

export function ListingDetail({ listing, related, moreFromSeller, reviews, jsonLd }: { listing: Listing; related: Listing[]; moreFromSeller?: Listing[]; reviews?: ReviewRecord[]; jsonLd: Record<string, unknown> }) {
  const { add } = useCart();
  const [img, setImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [report, setReport] = useState("");
  const [reportDone, setReportDone] = useState(false);

  const waNumber = "254700000000"; // replaced by seller-approved contact in production
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("Link copied!");
      }
    } catch {}
  };

  const submitReport = async () => {
    if (!report.trim()) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, reason: report }),
    }).catch(() => {});
    setReportDone(true);
  };

  return (
    <div className="container-bd py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="text-xs text-ink-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">Home</Link> /{" "}
        <Link href={listing.listingType === "classified" ? "/classifieds" : listing.listingType === "service" ? "/services" : "/shop"} className="hover:underline">
          {listing.listingType === "classified" ? "Classifieds" : listing.listingType === "service" ? "Services" : "Shop"}
        </Link>{" "}/ <span className="text-ink-700">{listing.title.slice(0, 60)}…</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.images[img]} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
          </div>
          {listing.images.length > 1 && (
            <div className="mt-2 flex gap-2">
              {listing.images.map((s, i) => (
                <button key={s + i} onClick={() => setImg(i)} aria-label={`View image ${i + 1}`} className={`overflow-hidden rounded-lg border-2 ${i === img ? "border-brand-600" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s} alt="" className="h-16 w-20 object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="card mt-4 p-5">
            <h2 className="font-bold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{listing.description}</p>
            {Object.keys(listing.attributes).length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(listing.attributes).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-sand-50 px-3 py-2">
                    <dt className="text-xs text-ink-400">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{listing.listingType}</Badge>
              <ConditionBadge condition={listing.condition} />
              {listing.negotiable && <Badge tone="red">Negotiable</Badge>}
            </div>
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{listing.title}</h1>
            <Price value={listing.price} compareAt={listing.compareAt} />
            <p className="text-sm text-ink-500">{listing.town}, {listing.county} · {listing.stock > 0 ? `In stock (${listing.stock})` : "Out of stock"}</p>
            <div className="flex items-center gap-2">
              <VerifiedBadge verified={listing.verified} />
              <span className="text-sm text-ink-500">by <strong>{listing.sellerName}</strong> ({listing.sellerType})</span>
            </div>

            {listing.transactionMethod === "buy_online" ? (
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1"
                  disabled={listing.stock <= 0}
                  onClick={() => {
                    add(listing.id, 1);
                    setAdded(true);
                    setTimeout(() => setAdded(false), 2000);
                  }}
                >
                  {added ? "Added ✓" : "Add to cart"}
                </button>
                <WishlistButton id={listing.id} title={listing.title} />
                <button onClick={share} className="btn-secondary" aria-label="Share listing"><Share2 className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Link href={`/messages/new?listing=${listing.id}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> {listing.transactionMethod === "request_quote" ? "Request a quote" : "Contact seller"}</Link>
                <div className="flex gap-2">
                  <a className="btn-secondary flex-1" href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hi! I'm interested in: " + listing.title)}`} target="_blank" rel="noreferrer">WhatsApp seller</a>
                  <button onClick={share} className="btn-secondary" aria-label="Share listing"><Share2 className="h-4 w-4" /></button>
                </div>
                <p className="text-xs text-ink-400">Contact details are shared per the seller&apos;s preferences. Meet in public & verify before paying.</p>
              </div>
            )}
            {listing.shopSlug && (
              <Link href={`/shops/${listing.shopSlug}`} className="link-bd text-sm">Visit seller&apos;s shop →</Link>
            )}
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Flag className="h-4 w-4" /> Report this listing</h2>
            {reportDone ? (
              <p className="mt-2 text-sm text-green-700">Thanks — our moderators will review with a recorded reason.</p>
            ) : (
              <div className="mt-2 flex gap-2">
                <input value={report} onChange={(e) => setReport(e.target.value)} placeholder="e.g. suspected fraud, wrong price…" className="input-bd" aria-label="Report reason" />
                <button onClick={submitReport} className="btn-secondary shrink-0">Send</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {moreFromSeller && moreFromSeller.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">More from {listing.sellerName}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {moreFromSeller.map((r) => (
              <Link key={r.id} href={listingHref(r)} className="card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.images[0]} alt={r.title} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <p className="clamp-2 mt-2 text-sm font-semibold">{r.title}</p>
                <p className="text-sm font-bold">{formatKES(r.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">Related from other sellers</h2>
          <p className="mt-1 text-sm text-ink-500">Similar items from classifieds and stores across Kenya — compare prices and sellers.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={listingHref(r)} className="card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.images[0]} alt={r.title} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <p className="clamp-2 mt-2 text-sm font-semibold">{r.title}</p>
                <p className="text-sm font-bold">{formatKES(r.price)}</p>
                <p className="mt-0.5 truncate text-xs text-ink-400">{r.sellerName} · {r.town}, {r.county}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ReviewsBlock reviews={reviews ?? []} title={`Reviews for ${listing.sellerName}`} />
    </div>
  );
}
