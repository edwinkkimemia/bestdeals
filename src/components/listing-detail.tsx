"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Flag,
  Link2,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { formatKES, timeAgo, formatFull } from "@/lib/format";
import { getListing, getShop, type Listing } from "@/data/catalog";
import { listingHref } from "@/lib/related";
import type { ReviewRecord } from "@/lib/store";
import { ReviewsBlock } from "./reviews-block";
import { ViewTracker } from "./view-tracker";
import { ViewCount } from "./view-count";
import { Badge, ConditionBadge, VerifiedBadge } from "@/components/ui/badge";
import { WmImage } from "@/components/ui/wm-image";
import { Price } from "@/components/ui/listing-card";
import { useCart } from "@/components/cart-provider";
import { WishlistButton } from "@/components/ui/wishlist-button";

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setUrl(window.location.href);
  }, []);
  if (!url) return null;
  const text = `${title} — via Chap`;
  const items = [
    { label: "Share on WhatsApp", href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`, Icon: WhatsAppIcon },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, Icon: XIcon },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, Icon: FacebookIcon },
    { label: "Share on Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, Icon: Send },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Share this listing">
      <span className="flex items-center gap-1 text-xs font-semibold text-ink-500"><Share2 className="h-3.5 w-3.5" /> Share:</span>
      {items.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-500 transition hover:border-brand-600 hover:text-brand-700">
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button" aria-label="Copy listing link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-ink-500 transition hover:border-brand-600 hover:text-brand-700"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ListingDetail({ listing, related, moreFromSeller, reviews, jsonLd }: { listing: Listing; related: Listing[]; moreFromSeller?: Listing[]; reviews?: ReviewRecord[]; jsonLd: Record<string, unknown> }) {
  const { add } = useCart();
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [report, setReport] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [recent, setRecent] = useState<Listing[]>([]);

  const shop = listing.shopSlug ? getShop(listing.shopSlug) : undefined;
  // WhatsApp ordering always uses the verified number: the snapshot taken at
  // posting time first, then the shop's approved contact. No number, no button.
  const waPhone = listing.sellerPhone
    ? toWhatsApp(listing.sellerPhone)
    : shop?.phone
      ? toWhatsApp(shop.phone)
      : null;
  const waOrderHref = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${listing.sellerName}! I'd like to order "${listing.title}" (${formatKES(listing.price)}) I saw on Chap. Is it available?`)}`
    : null;

  useEffect(() => {
    setQty(1);
    setImg(0);
    try {
      const raw = JSON.parse(localStorage.getItem("chap_recent_v1") || "[]") as string[];
      const next = [listing.id, ...raw.filter((x) => x !== listing.id)].slice(0, 12);
      localStorage.setItem("chap_recent_v1", JSON.stringify(next));
      setRecent(next.slice(1, 5).map(getListing).filter((x): x is Listing => Boolean(x)));
    } catch {}
  }, [listing.id]);

  const submitReport = async () => {
    if (!report.trim()) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, reason: report }),
    }).catch(() => {});
    setReportDone(true);
  };

  const lowStock = listing.stock > 0 && listing.stock <= 5 && listing.transactionMethod === "buy_online";

  return (
    <div className="overflow-x-clip pb-8">
      <ViewTracker listingId={listing.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="border-b border-neutral-200 bg-sand-50" aria-label="Breadcrumb">
        <div className="container-bd flex flex-wrap items-center gap-1.5 py-2.5 text-xs text-ink-400">
          <Link href="/" className="font-medium hover:text-brand-700 hover:underline">Home</Link>
          <span aria-hidden className="text-ink-300">/</span>
          <Link href={listing.listingType === "classified" ? "/classifieds" : listing.listingType === "service" ? "/services" : "/shop"} className="font-medium hover:text-brand-700 hover:underline">
            {listing.listingType === "classified" ? "Classifieds" : listing.listingType === "service" ? "Services" : "Shop"}
          </Link>
          <span aria-hidden className="shrink-0 text-ink-300">/</span>
          <span className="min-w-0 break-words font-semibold text-ink-700">{listing.title.slice(0, 60)}…</span>
        </div>
      </nav>
      <div className="container-bd">
      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[1.2fr_1fr]">
        <div className="order-1 min-w-0 lg:order-1">
          <div className="card overflow-hidden">
            <WmImage src={listing.images[img]} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
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
        </div>

        {/* Buy card — right after gallery on mobile, sticky rail on desktop */}
        <div className="order-2 min-w-0 lg:order-2 lg:sticky lg:top-36 lg:self-start">
          <div className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{listing.listingType}</Badge>
              <ConditionBadge condition={listing.condition} />
              {listing.negotiable && <Badge tone="red">Negotiable</Badge>}
              {listing.subcategory && (
                <Link href={`/search?category=${listing.categorySlug}&subcategory=${encodeURIComponent(listing.subcategory)}`} className="chip hover:border-brand-600 hover:text-brand-700">
                  {listing.subcategory}
                </Link>
              )}
            </div>
            <h1 className="break-words text-xl font-bold leading-snug sm:text-2xl">{listing.title}</h1>
            <Price value={listing.price} compareAt={listing.compareAt} />
            <p className="flex items-center gap-1 text-sm text-ink-500">
              <MapPin className="h-3.5 w-3.5" /> {listing.town}, {listing.county} ·{" "}
              {listing.stock > 0 ? `In stock (${listing.stock})` : "Out of stock"}
            </p>
            <ViewCount listingId={listing.id} />
            {lowStock && <p className="text-sm font-semibold text-accent-600">Only {listing.stock} left — order soon.</p>}

            {listing.transactionMethod === "buy_online" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Qty:</span>
                  <button aria-label="Decrease quantity" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button>
                  <span className="w-8 text-center font-bold" aria-live="polite">{qty}</span>
                  <button aria-label="Increase quantity" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300" onClick={() => setQty((q) => Math.min(Math.max(listing.stock, 1), 99, q + 1))}><Plus className="h-4 w-4" /></button>
                  <button
                    className="btn-primary min-w-0 flex-1"
                    disabled={listing.stock <= 0}
                    onClick={() => {
                      add(listing.id, qty);
                      setAdded(true);
                      setTimeout(() => setAdded(false), 2000);
                    }}
                  >
                    {added ? "Added ✓" : `Add to cart · ${formatKES(listing.price * qty)}`}
                  </button>
                  <WishlistButton id={listing.id} title={listing.title} />
                </div>
                <Link href={`/messages/new?listing=${listing.id}`} className="btn-secondary w-full">
                  <MessageCircle className="h-4 w-4" /> Message seller
                </Link>
                {waPhone && waOrderHref && (
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:+${waPhone}`} className="btn-secondary !px-3" title={`Call ${listing.sellerName}`}>
                      <Phone className="h-4 w-4" /> Call seller
                    </a>
                    <a href={waOrderHref} target="_blank" rel="noreferrer" className="btn-whatsapp !px-3">
                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Link href={`/messages/new?listing=${listing.id}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> {listing.transactionMethod === "request_quote" ? "Request a quote" : "Message seller"}</Link>
                {waPhone && waOrderHref ? (
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:+${waPhone}`} className="btn-secondary !px-3" title={`Call ${listing.sellerName}`}>
                      <Phone className="h-4 w-4" /> Call seller
                    </a>
                    <a href={waOrderHref} target="_blank" rel="noreferrer" className="btn-whatsapp !px-3">
                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-ink-400">This seller hasn&apos;t shared a WhatsApp number — use Message seller and they&apos;ll reply with one if they choose.</p>
                )}
                <p className="text-xs text-ink-400">Contact details are shared per the seller&apos;s preferences. Meet in public & verify before paying.</p>
              </div>
            )}

            <ShareButtons title={listing.title} />

            {listing.shopSlug && (
              <Link href={`/shops/${listing.shopSlug}`} className="link-bd flex items-center gap-1 text-sm"><Store className="h-4 w-4" /> Visit seller&apos;s shop →</Link>
            )}
          </div>
        </div>

        <div className="order-3 min-w-0 lg:order-3">
          <div className="card mt-4 p-5 lg:mt-0">
            <h2 className="font-bold">Description</h2>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-700">{listing.description}</p>
            {Object.keys(listing.attributes).length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(listing.attributes).map(([k, v]) => (
                  <div key={k} className="min-w-0 rounded-lg bg-sand-50 px-3 py-2">
                    <dt className="text-xs capitalize text-ink-400">{k}</dt>
                    <dd className="break-words font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-4 text-xs text-ink-400">Posted {formatFull(listing.createdAt)} ({timeAgo(listing.createdAt)}) · Listing ID: {listing.id.toUpperCase()}</p>
          </div>

          {/* Delivery & payments */}
          <div className="card mt-4 space-y-2 p-5 text-sm">
            <h2 className="flex items-center gap-2 font-bold"><Truck className="h-4 w-4 text-brand-600" /> Delivery & payments</h2>
            <p className="text-ink-700">{shop?.deliveryInfo ?? "Delivery arranged with the seller — confirm fee and timeline before paying."}</p>
            <p className="text-ink-500">Shop checkout is cash on delivery — pay the courier in cash when your order arrives. Totals are always computed on our servers.</p>
          </div>

          {/* Safety */}
          <div className="card mt-4 space-y-2 p-5 text-sm">
            <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-brand-600" /> Stay safe</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-700">
              <li>Meet in public, inspect before paying, never share your M-Pesa PIN.</li>
              <li>Keep chats on Chap until you&apos;re confident in the seller.</li>
              <li>Too good to be true? Compare with related sellers below.</li>
            </ul>
            <Link href="/safety" className="link-bd">Full buyer-safety guide →</Link>
          </div>
        </div>

        <div className="order-4 min-w-0 space-y-3 lg:order-4">
          {/* Seller card */}
          <div className="card space-y-3 p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-black text-white">
                {listing.sellerName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold">{listing.sellerName} <VerifiedBadge verified={listing.verified} /></p>
                <p className="truncate text-xs text-ink-500">
                  {listing.sellerType === "business" ? "Business seller" : "Individual seller"} · {listing.town}, {listing.county} · Enquiries go straight to their inbox
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/messages/new?listing=${listing.id}`} className="btn-primary !px-3">
                <MessageCircle className="h-4 w-4" /> Message
              </Link>
              {listing.shopSlug ? (
                <Link href={`/shops/${listing.shopSlug}`} className="btn-secondary !px-3">
                  <Store className="h-4 w-4" /> Visit shop
                </Link>
              ) : (
                <a href="#more-from-seller" className="btn-secondary !px-3">
                  <Store className="h-4 w-4" /> More items
                </a>
              )}
            </div>
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
        <section className="mt-10 scroll-mt-36" id="more-from-seller">
          <h2 className="section-title">More from {listing.sellerName}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {moreFromSeller.map((r) => (
              <Link key={r.id} href={listingHref(r)} className="card p-3">
                <WmImage src={r.images[0]} alt={r.title} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
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
                <WmImage src={r.images[0]} alt={r.title} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <p className="clamp-2 mt-2 text-sm font-semibold">{r.title}</p>
                <p className="text-sm font-bold">{formatKES(r.price)}</p>
                <p className="mt-0.5 truncate text-xs text-ink-400">{r.sellerName} · {r.town}, {r.county}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">Recently viewed</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {recent.map((r) => (
              <Link key={r.id} href={listingHref(r)} className="card p-3">
                <WmImage src={r.images[0]} alt={r.title} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                <p className="clamp-2 mt-2 text-sm font-semibold">{r.title}</p>
                <p className="text-sm font-bold">{formatKES(r.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ReviewsBlock reviews={reviews ?? []} title={`Reviews for ${listing.sellerName}`} />
      </div>
    </div>
  );
}
