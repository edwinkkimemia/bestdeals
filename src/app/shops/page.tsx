import Link from "next/link";
import { SHOPS } from "@/data/catalog";
import { storeRead } from "@/lib/store";
import { ratingLabel } from "@/lib/ratings";
import { Badge, PlanCheckmark } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { SafeImage } from "@/components/ui/safe-image";

export const metadata = {
  title: "Business Shops",
  description: "Branded Kenyan storefronts with catalogues, delivery info, wholesale enquiries and verified reviews.",
};

// New shops open daily — a static prerender would freeze this index at build time.
export const dynamic = "force-dynamic";

export default async function ShopsIndex() {
  const community = await storeRead((s) => s.listShops(), []);
  const twins = new Map(community.map((c) => [c.slug, c]));
  const { mergeShopDisplay } = await import("@/lib/live-listings");
  const withRatings = await Promise.all(
    SHOPS.map(async (s) => ({
      // Store twin (admin verification + header edits) wins over the frozen
      // catalogue copy — otherwise featured cards disagree with admin.
      shop: mergeShopDisplay(
        {
          slug: s.slug, name: s.name, description: s.description,
          businessCategory: s.businessCategory, county: s.county, town: s.town,
          phone: s.phone, logo: s.logo, cover: s.cover, verified: s.verified,
          deliveryInfo: s.deliveryInfo, hours: s.hours, planId: "free",
        },
        twins.get(s.slug) ?? null
      ),
      rating: ratingLabel(await storeRead((st) => st.listApprovedReviewsForShop(s.slug), [])),
    }))
  );
  return (
    <div className="container-bd py-8">
      <PageBreadcrumb trail={[{ href: "/", label: "Home" }, { label: "Business Shops" }]} />
      <h1 className="section-title mt-2">Business shops</h1>
      <p className="max-w-2xl text-sm text-ink-500">Branded storefronts with full catalogues, delivery info, bulk-buyer enquiries and moderated reviews — each shop lives at its own chap.co.ke address.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "✓ means checked", d: "Verified shops passed ID or business-permit review. A blue check is a Silver plan, gold is Gold — plan sellers support the marketplace. Unverified shops can still trade — inspect as usual." },
          { t: "Catalogue + bulk", d: "Browse the full range, or send one bulk enquiry for wholesale quantities and institutional quotes." },
          { t: "Reviews you can trust", d: "Only moderated reviews show — paid or delivered orders earn the Verified purchase badge." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-ink-500">{c.d}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-bold">Featured shops ({SHOPS.length})</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {withRatings.map(({ shop: s, rating }) => (
            <Link key={s.slug} href={`/shops/${s.slug}`} className="card overflow-hidden hover:shadow-lg">
              <div aria-hidden className="h-28 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800">
                {s.cover && (
                  <SafeImage src={s.cover} alt={`${s.name} cover`} loading="lazy" className="h-28 w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <p className="flex flex-wrap items-center gap-1.5 font-bold">{s.name} <PlanCheckmark plan={s.planId} size="sm" /> {s.verified ? <Badge tone="green">✓ Verified</Badge> : <Badge>Unverified</Badge>}</p>
                <p className="text-xs text-ink-500">{s.businessCategory} · {s.town}, {s.county} · {rating}</p>
              <p className="clamp-2 mt-1 text-sm text-ink-500">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {community.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 font-bold">New from the community ({community.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {community.map((s) => (
              <Link key={s.slug} href={`/shops/${s.slug}`} className="card overflow-hidden hover:border-brand-600">
                <div aria-hidden className="h-28 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800">
                  {s.coverUrl && (
                    <SafeImage src={s.coverUrl} alt={`${s.name} cover`} loading="lazy" className="h-28 w-full object-cover" />
                  )}
                </div>
                <div className="flex items-start gap-2.5 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 font-black text-white">
                    {s.logoUrl ? (
                      <SafeImage src={s.logoUrl} alt="" className="h-full w-full object-cover" fallback={s.name.charAt(0).toUpperCase()} />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5 font-bold">{s.name} <PlanCheckmark plan={s.planId} size="sm" /> {s.verified ? <Badge tone="green">✓ Verified</Badge> : <Badge>New</Badge>}</span>
                    <span className="block text-xs text-ink-500">{s.businessCategory} · {s.town}, {s.county}</span>
                    <span className="clamp-2 mt-1 block text-sm text-ink-500">{s.description}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="card mt-8 bg-brand-700 p-6 text-white">
        <h2 className="text-xl font-bold">Run a business? Open your shop free</h2>
        <p className="mt-1 max-w-2xl text-sm opacity-90">Free storefronts forever: your brand, your catalogue, your chap.co.ke address. Upgrade to Silver or Gold when bulk tools and promotions pay for themselves.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/shop" className="btn-accent">Open my shop</Link>
          <Link href="/pricing" className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Compare plans</Link>
        </div>
      </div>
    </div>
  );
}
