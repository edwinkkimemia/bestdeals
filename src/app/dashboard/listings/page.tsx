import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { WmImage } from "@/components/ui/wm-image";
import { formatKES, formatDay } from "@/lib/format";
import { getListingsStats } from "@/lib/analytics";

const TABS = ["all", "active", "pending", "rejected", "sold", "hidden", "draft", "expired"];

export default async function MyListings({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/listings");
  const tab = TABS.includes(searchParams.tab ?? "") ? (searchParams.tab as string) : "all";
  const store = getStore();
  const mine = await store.listListingsByOwner(user.id);
  const items = mine.filter((l) => tab === "all" || l.status === tab);
  const viewMap = new Map(
    (await getListingsStats(mine.map((l) => l.id), 30).catch(() => ({ perListing: [] as { listingId: string; views: number }[] }))).perListing.map((p) => [p.listingId, p.views])
  );
  // Staff view (Gold): catalogues of shops where this seller is a member.
  const staffShops = await store.listStaffShops(user.id).catch(() => []);
  const ownIds = new Set(mine.map((l) => l.id));
  const staffItems: { shopName: string; shopSlug: string; listing: (typeof mine)[number] }[] = [];
  for (const s of staffShops) {
    const items = await store.listListingsByShop(s.slug).catch(() => []);
    for (const l of items) {
      if (!ownIds.has(l.id) && !staffItems.some((x) => x.listing.id === l.id)) {
        staffItems.push({ shopName: s.name, shopSlug: s.slug, listing: l });
      }
    }
  }

  return (
    <div className="container-bd py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">My listings ({mine.length})</h1>
        <Link href="/sell" className="btn-primary">+ New listing</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Listing states">
        {TABS.map((t) => (
          <Link key={t} href={`/dashboard/listings?tab=${t}`} className={`chip ${tab === t ? "!border-brand-600 !text-brand-700" : ""}`}>{t}</Link>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">{mine.length === 0 ? "You haven't listed anything yet" : `Nothing in “${tab}”`}</p>
          <p className="mt-1 text-sm text-ink-500">Listings go live after moderation. Photos upload straight from your phone.</p>
          <Link href="/sell" className="btn-primary mt-4">Create your first listing →</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((l) => (
            <li key={l.id} className="card flex items-center gap-3 p-3">
              {l.images[0] ? (
                <WmImage src={l.images[0]} alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/chaplogo.png" alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-ink-400">{l.type} · {formatKES(l.price)} · {l.town}, {l.county} · {(viewMap.get(l.id) ?? 0).toLocaleString()} views · {formatDay(l.createdAt)}</p>
              </div>
              <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : l.status === "rejected" ? "red" : "neutral"}>{l.status}</Badge>
              <Link href={`/dashboard/listings/${l.id}`} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Manage</Link>
            </li>
          ))}
        </ul>
      )}
      {staffItems.length > 0 && (
        <>
          <h2 className="mt-8 font-bold">Shop catalogues you staff ({staffItems.length})</h2>
          <p className="mt-1 text-sm text-ink-500">Listings from shops where you&apos;re a staff member — you can manage these too.</p>
          <ul className="mt-3 space-y-2">
            {staffItems.map(({ shopName, listing: l }) => (
              <li key={l.id} className="card flex items-center gap-3 p-3">
                {l.images[0] ? (
                  <WmImage src={l.images[0]} alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/chaplogo.png" alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.title}</p>
                  <p className="text-xs text-ink-400">{l.type} · {formatKES(l.price)} · {shopName} · staff</p>
                </div>
                <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : l.status === "rejected" ? "red" : "neutral"}>{l.status}</Badge>
                <Link href={`/dashboard/listings/${l.id}`} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Manage</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
