import Link from "next/link";
import { formatKES, savings } from "@/lib/format";
import type { Listing } from "@/data/catalog";
import { Badge } from "./badge";
import { Heart } from "lucide-react";
import { WishlistButton } from "./wishlist-button";
import { WmImage } from "./wm-image";
import { PlanCheckmark, tenureLabel } from "./badge";

export function Price({ value, compareAt }: { value: number; compareAt?: number | null }) {
  const pct = compareAt ? savings(compareAt, value) : null;
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-lg font-bold text-ink-900">{formatKES(value)}</span>
      {compareAt && compareAt > value && (
        <>
          <span className="text-sm text-ink-400 line-through">{formatKES(compareAt)}</span>
          {pct && <Badge tone="green">−{pct}%</Badge>}
        </>
      )}
    </div>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const href =
    listing.listingType === "classified"
      ? `/classifieds/${listing.slug}`
      : listing.listingType === "service"
        ? `/services/${listing.slug}`
        : `/product/${listing.slug}`;
  const tenure = tenureLabel(listing.sellerSince);
  return (
    <div className="card group overflow-hidden transition hover:shadow-lg">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-sand-100">
        <WmImage
          src={listing.images[0]}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex gap-1">
          {listing.featured && <Badge tone="red">Featured</Badge>}
          <Badge>{listing.listingType === "product" ? "Shop" : listing.listingType === "service" ? "Service" : "Classified"}</Badge>
        </div>
        <div className="absolute right-2 top-2">
          <WishlistButton id={listing.id} title={listing.title} />
        </div>
      </Link>
      <div className="space-y-1 p-2.5">
        <Link href={href} className="clamp-2 min-h-9 text-[13px] font-semibold leading-snug text-ink-900 hover:text-brand-700">
          {listing.title}
        </Link>
        <p className="text-base font-bold text-ink-900">{formatKES(listing.price)}</p>
        <p className="flex min-w-0 items-center gap-1 text-[11px] text-ink-500">
          {/* Plan check replaces the verified tick (never both); free verified sellers keep the tick. */}
          <span className="truncate">
            {listing.verified && listing.planId !== "silver" && listing.planId !== "gold" ? `✓ ${listing.sellerName}` : listing.sellerName}
          </span>
          <PlanCheckmark plan={listing.planId} size="sm" />
          {tenure && (
            <span className="shrink-0 text-ink-400" title={`Seller on Chap for ${tenure}`}>
              · {tenure}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function HeartIcon() {
  return <Heart className="h-4 w-4" />;
}
