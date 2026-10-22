import Link from "next/link";
import type { Listing } from "@/data/catalog";
import { ListingCard } from "@/components/ui/listing-card";

type ListingRailProps = {
  id: string;
  title: string;
  subtitle: string;
  items: Listing[];
  moreHref: string;
  limit?: number;
  className?: string;
};

/** Standard listing rail used by the location index and county pages. */
export function ListingRail({
  id,
  title,
  subtitle,
  items,
  moreHref,
  limit = 12,
  className = "mt-8",
}: ListingRailProps) {
  if (items.length === 0) return null;
  return (
    <section className={className} aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 id={id} className="section-title">{title} ({items.length})</h2>
          <p className="text-sm text-ink-500">{subtitle}</p>
        </div>
        <Link href={moreHref} className="link-bd">View all →</Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {items.slice(0, limit).map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  );
}
