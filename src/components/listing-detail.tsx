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
import { toSafeHtml } from "@/lib/richtext";
import { getListing, getShop, type Listing } from "@/data/catalog";
import { listingHref } from "@/lib/related";
import type { ReviewRecord } from "@/lib/store";
import { ReviewsBlock } from "./reviews-block";
import { ReviewForm } from "./review-form";
import { ViewTracker } from "./view-tracker";
import { ViewCount } from "./view-count";
import { Badge, ConditionBadge, VerifiedBadge } from "@/components/ui/badge";
import { WmImage } from "@/components/ui/wm-image";
import { SafeImage } from "@/components/ui/safe-image";
import { ProductGallery } from "@/components/product-gallery";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { Price } from "@/components/ui/listing-card";
import { useCart } from "@/components/cart-provider";
import { WishlistButton } from "@/components/ui/wishlist-button";

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
}

/** Seller profile URL: stable account id when known, else the name slug. */
function sellerPageUrl(ownerId: string | undefined, sellerName: string): string {
  if (ownerId) return `/seller/${encodeURIComponent(ownerId)}`;
  const slug =
    sellerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "seller";
  return `/seller/${encodeURIComponent(slug)}`;
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

export function ListingDetail({ listing, related, moreFromSeller, reviews, listingReviews, jsonLd, sellerPhotoUrl, previewStatus, shopInfo }: { listing: Listing; related: Listing[]; moreFromSeller?: Listing[]; reviews?: ReviewRecord[]; listingReviews?: ReviewRecord[]; jsonLd: Record<string, unknown>; sellerPhotoUrl?: string | null; previewStatus?: string | null; shopInfo?: { name: string; logoUrl: string | null; verified: boolean; businessCategory: string; town: string; county: string; phone?: string | null } | null }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [report, setReport] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [recent, setRecent] = useState<Listing[]>([]);

  const shop = listing.shopSlug ? getShop(listing.shopSlug) : undefined;
  // Shop listings show the shop identity, not the owner's personal profile.
  const shopCard = shopInfo ?? (shop ? { name: shop.name, logoUrl: shop.logo, verified: shop.verified, businessCategory: shop.businessCategory, town: shop.town, county: shop.county } : null);
  // Avatar: owner's photo for individual sellers, shop logo for shop listings.
  const avatarUrl = shopCard ? shopCard.logoUrl : (sellerPhotoUrl ?? null);
  // WhatsApp ordering always uses the verified number: the snapshot taken at
  // posting time first, then the shop's approved contact (store twin wins —
  // the catalogue phone goes stale after seller edits). No number, no button.
  const shopPhone = shopInfo?.phone ?? shop?.phone;
  const waPhone = listing.sellerPhone
    ? toWhatsApp(listing.sellerPhone)
    : shopPhone
      ? toWhatsApp(shopPhone)
      : null;
  const waOrderHref = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${listing.sellerName}! I'd like to order "${listing.title}" (${formatKES(listing.price)}) I saw on Chap. Is it available?`)}`
    : null;

  useEffect(() => {
    setQty(1);
    try {
      const raw = JSON.parse(localStorage.getItem("chap_recent_v1") || "[]") as string[];
      const next = [listing.id, ...raw.filter((x) => x !== listing.id)].slice(0, 12);
      localStorage.setItem("chap_recent_v1", JSON.stringify(next));
      setRecent(next.slice(1, 5).map(getListing).filter((x): x is Listing => Boolean(x)));
    } catch {}
  }, [listing.id]);

  const submitReport = async (reason: string, details?: string) => {
    if (!reason.trim()) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, reason, details }),
    }).catch(() => {});
    setReportDone(true);
  };

  const trackReveal = (channel: string) => {
    fetch("/api/analytics/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, channel }),
    }).catch(() => {});
  };

  const REPORT_PICKER = [
    { code: "illegal", label: "Illegal / prohibited" },
    { code: "prepayment", label: "Asks for prepayment" },
    { code: "spam", label: "Spam / duplicate" },
    { code: "wrong", label: "Wrong category" },
    { code: "other", label: "Other" },
  ];

  const lowStock = listing.stock > 0 && listing.stock <= 5 && listing.transactionMethod === "buy_online";

  return (
    <div className="overflow-x-clip pb-8">
      <ViewTracker listingId={listing.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {previewStatus && previewStatus !== "active" && (
        <div className="border-b border-amber-200 bg-amber-50" role="status">
          <div className="container-bd flex flex-wrap items-center gap-2 py-2.5 text-sm text-amber-900">
            <span className="font-bold">Preview — not live yet ({previewStatus}).</span>
            <span className="text-amber-800">Only you, your shop staff and admins can see this. Share the link, but others will see it only after moderation approves it.</span>
          </div>
        </div>
      )}
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
      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="order-1 min-w-0 lg:order-1">
          {/* Keyed by listing: same-title listings must never inherit gallery state. */}
          <ProductGallery key={listing.id} images={listing.images} title={listing.title} />
        </div>

        {/* Buy card — right after gallery on mobile, sticky rail on desktop.
            Capped to the viewport so a tall rail never covers content scrolling
            beneath it; extra buttons stay reachable via inner scroll. */}
        <div className="order-2 min-w-0 lg:order-2 lg:sticky lg:top-36 lg:z-10 lg:self-start">
          <div className="card space-y-3 p-5 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
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
                <Link href={`/dashboard/messages/new?listing=${listing.id}`} className="btn-secondary w-full">
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
                <Link href={`/dashboard/messages/new?listing=${listing.id}`} className="btn-primary"><MessageCircle className="h-4 w-4" /> {listing.transactionMethod === "request_quote" ? "Request a quote" : "Message seller"}</Link>
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
          </div>
        </div>

        <div className="order-3 min-w-0 lg:order-3">
          <div className="card mt-4 p-5 lg:mt-0">
            <h2 className="font-bold">Description</h2>
            <div
              className="mt-2 space-y-2 break-words text-sm leading-relaxed text-ink-700 [&_a]:text-brand-700 [&_a]:underline [&_code]:rounded [&_code]:bg-sand-100 [&_code]:px-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: toSafeHtml(listing.description, 6000) }}
            />
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

      </div>

      {/* Seller + report — full width BELOW the grid. Anything sharing the
          sticky buy rail's column would scroll up underneath it while pinned;
          down here nothing can pass under the rail. */}
      <section className="mt-6 grid gap-3 lg:grid-cols-2" aria-label="Seller and report">
        <div className="card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-lg font-black text-white">
              {avatarUrl ? (
                <SafeImage src={avatarUrl} alt="" className="h-full w-full object-cover" fallback={(shopCard ? shopCard.name : listing.sellerName).charAt(0).toUpperCase()} />
              ) : (
                (shopCard ? shopCard.name : listing.sellerName).charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              {shopCard ? (
                <>
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    {shopCard.name} {shopCard.verified ? <Badge tone="green">✓ Verified business</Badge> : <Badge>Verification pending</Badge>}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {shopCard.businessCategory} · {shopCard.town}, {shopCard.county} · Enquiries go straight to their inbox
                  </p>
                </>
              ) : (
                <>
                  <p className="flex flex-wrap items-center gap-2 font-bold">{listing.sellerName} <VerifiedBadge verified={listing.verified} /></p>
                  <p className="truncate text-xs text-ink-500">
                    {listing.sellerType === "business" ? "Business seller" : "Individual seller"} · {listing.town}, {listing.county} · Enquiries go straight to their inbox
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/dashboard/messages/new?listing=${listing.id}`} onClick={() => trackReveal("chat")} className="btn-primary !px-3">
              <MessageCircle className="h-4 w-4" /> Message
            </Link>
            {listing.shopSlug ? (
              <Link href={`/shops/${listing.shopSlug}`} className="btn-secondary !px-3">
                <Store className="h-4 w-4" /> Visit shop
              </Link>
            ) : (
              <Link href={sellerPageUrl(listing.ownerId, listing.sellerName)} className="btn-secondary !px-3">
                <Store className="h-4 w-4" /> Visit seller
              </Link>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Flag className="h-4 w-4" /> Report this listing</h2>
          {reportDone ? (
            <p className="mt-2 text-sm text-green-700">Thanks — our moderators will review with a recorded reason.</p>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {REPORT_PICKER.map((r) => (
                  <button key={r.code} onClick={() => submitReport(r.code, report)} className="rounded-full border px-3 py-1 text-xs hover:bg-sand-50">{r.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={report} onChange={(e) => setReport(e.target.value)} placeholder="Details (optional)…" className="input-bd" aria-label="Report details" />
                <button onClick={() => submitReport("other", report)} className="btn-secondary shrink-0">Send</button>
              </div>
            </div>
          )}
        </div>
      </section>

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
      {(listingReviews ?? []).length > 0 && (
        <ReviewsBlock reviews={listingReviews ?? []} title={`Reviews for this listing`} />
      )}
      <ReviewForm listingId={listing.id} shopSlug={listing.shopSlug} sellerName={listing.sellerName} />
      </div>
    </div>
  );
}
