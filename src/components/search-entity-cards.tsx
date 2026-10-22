import Link from "next/link";
import { Badge, PlanCheckmark } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import type { SellerSearchResult, ShopSearchResult } from "@/lib/entity-search";

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function SellerResultCard({ seller }: { seller: SellerSearchResult }) {
  const href = seller.userId
    ? `/seller/${encodeURIComponent(seller.userId)}`
    : `/seller/${encodeURIComponent(seller.slug)}`;
  return (
    <Link href={href} className="card flex items-start gap-3 p-4 hover:border-brand-600">
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-lg font-black text-white"
      >
        {seller.photoUrl ? (
          <SafeImage
            src={seller.photoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            fallback={seller.name.charAt(0).toUpperCase()}
          />
        ) : (
          seller.name.charAt(0).toUpperCase()
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 font-bold">
          {seller.name}
          <PlanCheckmark plan={seller.planId} size="sm" />
          {seller.verified ? <Badge tone="green">✓ Verified</Badge> : null}
        </span>
        <span className="block text-xs text-ink-500">
          {seller.sellerKind === "business" ? "Business seller" : "Individual seller"}
          {seller.listingsCount > 0 ? ` · ${countLabel(seller.listingsCount, "listing")}` : ""}
          {seller.county ? ` · ${seller.town ? `${seller.town}, ` : ""}${seller.county}` : ""}
        </span>
        {seller.businessName && seller.businessName !== seller.name ? (
          <span className="block text-xs font-medium text-ink-500">{seller.businessName}</span>
        ) : null}
        {seller.bio ? <span className="clamp-2 mt-1 block text-sm text-ink-500">{seller.bio}</span> : null}
      </span>
    </Link>
  );
}

export function ShopResultCard({ shop }: { shop: ShopSearchResult }) {
  return (
    <Link href={`/shops/${encodeURIComponent(shop.slug)}`} className="card flex items-start gap-3 p-4 hover:border-brand-600">
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 text-lg font-black text-white"
      >
        {shop.logo ? (
          <SafeImage
            src={shop.logo}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            fallback={shop.name.charAt(0).toUpperCase()}
          />
        ) : (
          shop.name.charAt(0).toUpperCase()
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 font-bold">
          {shop.name}
          <PlanCheckmark plan={shop.planId} size="sm" />
          {shop.verified ? <Badge tone="green">✓ Verified</Badge> : <Badge>Shop</Badge>}
        </span>
        <span className="block text-xs text-ink-500">
          {shop.businessCategory || "Business shop"}
          {shop.county ? ` · ${shop.town ? `${shop.town}, ` : ""}${shop.county}` : ""}
          {shop.listingsCount > 0 ? ` · ${countLabel(shop.listingsCount, "listing")}` : ""}
        </span>
        {shop.description ? <span className="clamp-2 mt-1 block text-sm text-ink-500">{shop.description}</span> : null}
      </span>
    </Link>
  );
}
