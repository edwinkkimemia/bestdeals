import { NextRequest, NextResponse } from "next/server";
import { getShop, shopListings } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import {
  getLiveShopListings,
  mergeShopDisplay,
  mergeStaticAndLive,
  withLiveVerification,
} from "@/lib/live-listings";

/** Public shop/storefront profile + catalogue + reviews. */
export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ error: "Shop is required." }, { status: 400 });

  const demo = getShop(slug);
  const stored = await storeRead((s) => s.getShopBySlug(slug), null).catch(() => null);
  if (!demo && !stored) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const base = demo
    ? {
        slug: demo.slug,
        name: demo.name,
        description: demo.description,
        businessCategory: demo.businessCategory,
        county: demo.county,
        town: demo.town,
        phone: demo.phone,
        logo: demo.logo,
        cover: demo.cover,
        verified: demo.verified,
        deliveryInfo: demo.deliveryInfo,
        hours: demo.hours,
        planId: "free",
      }
    : {
        slug: stored!.slug,
        name: stored!.name,
        description: stored!.description,
        businessCategory: stored!.businessCategory,
        county: stored!.county,
        town: stored!.town,
        phone: stored!.phone,
        logo: stored!.logoUrl ?? null,
        cover: stored!.coverUrl ?? null,
        verified: stored!.verified ?? false,
        deliveryInfo: stored!.deliveryInfo ?? "",
        hours: stored!.hours ?? "",
        planId: stored!.planId ?? "free",
      };

  const shop = demo ? mergeShopDisplay(base, stored) : base;
  const [live, reviews] = await Promise.all([
    getLiveShopListings(slug).catch(() => []),
    storeRead((s) => s.listApprovedReviewsForShop(slug), []).catch(() => []),
  ]);
  const items = await withLiveVerification(
    mergeStaticAndLive(demo ? shopListings(slug) : [], live)
  ).catch(() => []);

  return NextResponse.json({
    shop: {
      ...shop,
      email: (stored as { email?: string | null } | null)?.email ?? null,
      website: (stored as { website?: string | null } | null)?.website ?? null,
      socials: (stored as { socials?: Record<string, string> | null } | null)?.socials ?? null,
    },
    items,
    reviews,
  });
}
