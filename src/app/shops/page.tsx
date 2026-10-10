import Link from "next/link";
import { SHOPS } from "@/data/catalog";
import { getStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Business Shops",
  description: "Branded Kenyan storefronts with catalogues, delivery info, wholesale enquiries and verified reviews.",
};

export default async function ShopsIndex() {
  const community = await getStore().listShops();
  return (
    <div className="container-bd py-8">
      <nav className="text-xs text-ink-400"><Link href="/" className="hover:underline">Home</Link> / <span>Business Shops</span></nav>
      <h1 className="section-title mt-2">Business shops</h1>
      <p className="max-w-2xl text-sm text-ink-500">Branded storefronts with full catalogues, delivery info, bulk-buyer enquiries and moderated reviews — each shop lives at its own chap.co.ke address.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "✓ means checked", d: "Verified shops passed ID or business-permit review. Unverified shops can still trade — inspect as usual." },
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
        {SHOPS.map((s) => (
          <Link key={s.slug} href={`/shops/${s.slug}`} className="card overflow-hidden hover:shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.cover} alt={s.name} loading="lazy" className="h-28 w-full object-cover" />
            <div className="p-4">
              <p className="font-bold">{s.name} {s.verified ? <Badge tone="green">✓ Verified</Badge> : <Badge>Unverified</Badge>}</p>
              <p className="text-xs text-ink-500">{s.businessCategory} · {s.town}, {s.county} · ★ {s.rating}</p>
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
              <Link key={s.slug} href={`/shops/${s.slug}`} className="card p-4 hover:border-brand-600">
                <p className="font-bold">{s.name} {s.verified ? <Badge tone="green">✓ Verified</Badge> : <Badge>New</Badge>}</p>
                <p className="text-xs text-ink-500">{s.businessCategory} · {s.town}, {s.county}</p>
                <p className="clamp-2 mt-1 text-sm text-ink-500">{s.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="card mt-8 bg-brand-700 p-6 text-white">
        <h2 className="text-xl font-bold">Run a business? Open your shop free</h2>
        <p className="mt-1 max-w-2xl text-sm opacity-90">Starter storefronts are free forever: your brand, your catalogue, your chap.co.ke address. Upgrade to Growth or Professional when bulk tools and promotions pay for themselves.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/shop" className="btn-accent">Open my shop</Link>
          <Link href="/pricing" className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Compare plans</Link>
        </div>
      </div>
    </div>
  );
}
