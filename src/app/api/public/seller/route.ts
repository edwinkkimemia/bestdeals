import { NextRequest, NextResponse } from "next/server";
import { storeRead } from "@/lib/store";
import {
  getSellerListings,
  resolveSellerContact,
  resolveSellerProfile,
  withLiveVerification,
} from "@/lib/live-listings";

/**
 * Public seller profile + their active listings, shops and approved reviews.
 * Read-only, no phone/email beyond the seller's chosen public contact.
 */
export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ error: "Seller is required." }, { status: 400 });
  const profile = await resolveSellerProfile(slug).catch(() => null);
  if (!profile) return NextResponse.json({ error: "Seller not found." }, { status: 404 });

  const items = await getSellerListings(profile).catch(() => []);
  const [live, shops, reviews] = await Promise.all([
    withLiveVerification(items),
    profile.userId
      ? storeRead((s) => s.listShopsByOwner(profile.userId as string), []).catch(() => [])
      : Promise.resolve([]),
    storeRead(async (s) => {
      const byName = await s.listApprovedReviewsForSeller(profile.name).catch(() => []);
      const byBusiness = profile.businessName
        ? await s.listApprovedReviewsForSeller(profile.businessName).catch(() => [])
        : [];
      const seen = new Set<string>();
      return [...byName, ...byBusiness].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    }, []).catch(() => []),
  ]);

  return NextResponse.json({
    profile,
    items: live,
    shops: shops.map((s) => ({
      slug: s.slug,
      name: s.name,
      logoUrl: s.logoUrl ?? null,
      verified: s.verified ?? false,
    })),
    reviews,
    contact: resolveSellerContact(items, shops),
  });
}
