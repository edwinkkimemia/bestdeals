import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/format";

const TABS = ["all", "active", "pending", "rejected", "sold", "hidden"];

export default async function MyListings({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/listings");
  const tab = searchParams.tab ?? "all";
  const mine = await getStore().listListingsByOwner(user.id);
  const items = mine.filter((l) => tab === "all" || l.status === tab);

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.images[0] ?? "/chaplogo.png"} alt="" className="h-14 w-16 rounded-lg bg-sand-100 object-cover" />
              <div className="flex-1">
                <p className="truncate text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-ink-400">{l.type} · {formatKES(l.price)} · {l.town}, {l.county}</p>
              </div>
              <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : l.status === "rejected" ? "red" : "neutral"}>{l.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
