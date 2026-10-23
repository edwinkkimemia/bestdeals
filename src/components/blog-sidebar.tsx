import Link from "next/link";
import { Megaphone, Store, Tag } from "lucide-react";
import { LISTINGS, POPULAR_SEARCHES } from "@/data/catalog";
import { listingHref } from "@/lib/related";
import { formatKES } from "@/lib/format";
import { WmImage } from "@/components/ui/wm-image";

/** Sidebar for public blog pages: featured products, advertise CTA, popular searches. */
export function BlogSidebar({ latestPosts }: { latestPosts?: { slug: string; title: string }[] }) {
  const featured = [
    ...LISTINGS.filter((l) => l.featured),
    ...LISTINGS.filter((l) => !l.featured).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  ].slice(0, 4);

  return (
    <aside aria-label="Blog sidebar" className="space-y-4 self-start lg:sticky lg:top-28">
      <div className="card p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold"><Tag className="h-4 w-4 text-brand-600" /> Featured products</p>
        <ul className="mt-3 space-y-3">
          {featured.map((l) => (
            <li key={l.id}>
              <Link href={listingHref(l)} className="group flex gap-2.5">
                <WmImage src={l.images[0]} alt="" loading="lazy" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0">
                  <span className="clamp-2 block text-[13px] font-semibold leading-snug group-hover:text-brand-700 group-hover:underline">{l.title}</span>
                  <span className="mt-0.5 block text-[13px] font-extrabold">{formatKES(l.price)}</span>
                  <span className="block truncate text-[11px] text-ink-400">{l.sellerName} · {l.town}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/browse" className="link-bd mt-3 inline-block text-xs">Browse all products →</Link>
      </div>

      <div className="card bg-brand-700 p-5 text-white">
        <p className="flex items-center gap-1.5 font-bold"><Megaphone className="h-4 w-4" /> Reach buyers across Kenya</p>
        <p className="mt-1 text-[13px] opacity-90">Boost a listing from {formatKES(199)} — labelled Featured, never overrides moderation.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/promotion" className="btn-accent !px-4 !py-2 !text-xs">Promote a listing</Link>
          <Link href="/advertising" className="rounded-xl border border-white/40 px-4 py-2 text-xs font-semibold hover:bg-white/10">Ad options</Link>
        </div>
      </div>

      <div className="card p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold"><Store className="h-4 w-4 text-brand-600" /> Sell on Chap</p>
        <p className="mt-1 text-[13px] text-ink-500">Free to start. Verified sellers earn the ✓ badge.</p>
        <Link href="/start-selling" className="btn-secondary mt-3 w-full !py-2 !text-xs">Start selling — it&apos;s free</Link>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold">Popular right now</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POPULAR_SEARCHES.slice(0, 6).map((s) => (
            <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip hover:border-brand-600 hover:text-brand-700">{s}</Link>
          ))}
        </div>
      </div>

      {latestPosts && latestPosts.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold">Latest articles</p>
          <ul className="mt-2 space-y-2">
            {latestPosts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="block text-[13px] font-medium leading-snug hover:text-brand-700 hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
          <Link href="/blog" className="link-bd mt-2 inline-block text-xs">All articles →</Link>
        </div>
      )}
    </aside>
  );
}
