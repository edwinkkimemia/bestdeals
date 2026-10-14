import Link from "next/link";
import { Eye, PackagePlus, Plus, Store } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { WmImage } from "@/components/ui/wm-image";
import { formatKES, formatDay } from "@/lib/format";
import { getListingsStats } from "@/lib/analytics";
import { CopyListingLink } from "@/components/copy-listing-link";
import { DeleteListingButton } from "@/components/delete-listing-button";

const publicPath = (l: { type: string; slug: string }) =>
  `/${l.type === "classified" ? "classifieds" : l.type === "service" ? "services" : "product"}/${l.slug}`;

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
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title">My listings ({mine.length})</h1>
          <p className="mt-1 text-sm text-ink-500">Track moderation, views and stock — manage any listing below.</p>
        </div>
        <Link href="/sell" className="btn-primary !py-2 text-sm"><Plus className="h-4 w-4" /> New listing</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Listing states">
        {TABS.map((t) => {
          const n = t === "all" ? mine.length : mine.filter((l) => l.status === t).length;
          return (
            <Link key={t} href={`/dashboard/listings?tab=${t}`} className={`chip ${tab === t ? "!border-brand-600 !text-brand-700" : ""}`}>
              {t} · {n}
            </Link>
          );
        })}
      </div>
      {items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <PackagePlus className="mx-auto h-10 w-10 text-brand-600" />
          <p className="mt-2 font-bold">{mine.length === 0 ? "You haven't listed anything yet" : `Nothing in “${tab}”`}</p>
          <p className="mt-1 text-sm text-ink-500">Listings go live after moderation. Photos upload straight from your phone.</p>
          <Link href="/sell" className="btn-primary mt-4">Create your first listing →</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((l) => (
            <li key={l.id} className="card flex items-center gap-3 p-3 transition hover:border-brand-600">
              {l.images[0] ? (
                <WmImage src={l.images[0]} alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/chaplogo.png" alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{l.title}</p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-400">
                  <span>{l.type} · {formatKES(l.price)} · {l.town}, {l.county}</span>
                  <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{(viewMap.get(l.id) ?? 0).toLocaleString()}</span>
                  <span>{formatDay(l.createdAt)}</span>
                </p>
              </div>
              <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : l.status === "rejected" ? "red" : "neutral"}>{l.status}</Badge>
              {l.status === "active" ? (
                <Link
                  href={publicPath(l)}
                  className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  View live
                </Link>
              ) : (
                <Link
                  href={publicPath(l)}
                  title="Only you, your shop staff and admins can see this until moderation approves it."
                  className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  Preview
                </Link>
              )}
              <CopyListingLink path={publicPath(l)} />
              {l.status === "active" && l.images.length > 0 && (
                <Link href={`/dashboard/promotion?listing=${l.id}`} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
                  Promote
                </Link>
              )}
              <Link href={`/dashboard/listings/${l.id}`} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Manage</Link>
              <DeleteListingButton id={l.id} title={l.title} />
            </li>
          ))}
        </ul>
      )}
      {staffItems.length > 0 && (
        <>
          <h2 className="mt-8 flex items-center gap-2 font-bold"><Store className="h-4 w-4 text-brand-600" /> Shop catalogues you staff ({staffItems.length})</h2>
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
                <Link
                  href={publicPath(l)}
                  title={l.status === "active" ? "Open the live product page" : "Staff preview — public only after approval"}
                  className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs"
                >
                  {l.status === "active" ? "View live" : "Preview"}
                </Link>
                <CopyListingLink path={publicPath(l)} />
                <Link href={`/dashboard/listings/${l.id}`} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">Manage</Link>
                <DeleteListingButton id={l.id} title={l.title} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
