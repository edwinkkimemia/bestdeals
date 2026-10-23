import Link from "next/link";
import { CATEGORIES, type Category } from "@/data/catalog";
import { CategoryIcon } from "@/components/category-icon";

type CategoryStripProps = {
  categories?: Category[];
  title?: string;
  /** Pass null to hide the "View all" link (e.g. on the shop index itself). */
  viewAllHref?: string | null;
  viewAllLabel?: string;
  hrefFor?: (category: Category) => string;
  /** Optional per-category badge, e.g. classifieds counts. */
  counts?: Record<string, number>;
  className?: string;
};

/**
 * Compact, swipeable category rail. Used on the home hero and listing indexes
 * so a full catalogue of categories costs one short row instead of a grid.
 */
export function CategoryStrip({
  categories = CATEGORIES,
  title = "Browse by category",
  viewAllHref = "/browse",
  viewAllLabel = "View all →",
  hrefFor = (c) => `/browse/${c.slug}`,
  counts,
  className = "",
}: CategoryStripProps) {
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
        {categories.map((c) => {
          const count = counts?.[c.slug] ?? 0;
          return (
            <Link
              key={c.slug}
              href={hrefFor(c)}
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
                  <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                </span>
                {count > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </div>
              <p className="clamp-2 px-2 py-1.5 text-[11px] font-semibold leading-tight group-hover:text-brand-700">
                {c.name}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
