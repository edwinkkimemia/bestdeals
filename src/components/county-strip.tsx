import Link from "next/link";
import { MapPin } from "lucide-react";
import { countySlug, type KenyaCounty } from "@/lib/kenya";

type CountyWithCount = KenyaCounty & { count?: number };

type CountyStripProps = {
  counties: CountyWithCount[];
  title?: string;
  /** Pass null to hide the "View all" link (e.g. on the locations index itself). */
  viewAllHref?: string | null;
  viewAllLabel?: string;
  className?: string;
};

/**
 * Compact, swipeable county rail for the home page and location indexes.
 * A full location directory costs one short row instead of a tall card grid.
 */
export function CountyStrip({
  counties,
  title = "Shop by location",
  viewAllHref = "/location",
  viewAllLabel = "View all →",
  className = "",
}: CountyStripProps) {
  return (
    <section className={className} aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="shrink-0 text-xs font-semibold text-brand-700 hover:underline">
            {viewAllLabel}
          </Link>
        )}
      </div>
      <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" role="list" aria-label={title}>
        {counties.map((c) => {
          const count = c.count ?? 0;
          return (
            <Link
              key={c.county}
              href={`/location/${countySlug(c.county)}`}
              role="listitem"
              className="group w-28 shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-brand-600 sm:w-32"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  className="h-14 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-16"
                />
                <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-brand-700 shadow">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                {count > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </div>
              <p className="clamp-2 px-2 py-1.5 text-[11px] font-semibold leading-tight group-hover:text-brand-700">
                {c.county}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
