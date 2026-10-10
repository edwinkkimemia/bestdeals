import Link from "next/link";

export type Crumb = { href?: string; label: string };

/**
 * Full-bleed breadcrumb bar matching the product pages. Drop it as the first
 * child of a `container-bd py-8` wrapper — negative margins stretch it flush
 * under the sticky header while the inner container keeps text aligned.
 */
export function PageBreadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="-mx-4 -mt-8 border-b border-neutral-200 bg-sand-50 sm:-mx-6 lg:-mx-8" aria-label="Breadcrumb">
      <div className="container-bd flex flex-wrap items-center gap-1.5 py-2.5 text-xs text-ink-400">
        {trail.map((t, i) => {
          const last = i === trail.length - 1;
          return (
            <span key={`${t.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="shrink-0 text-ink-300">
                  /
                </span>
              )}
              {t.href && !last ? (
                <Link href={t.href} className="font-medium hover:text-brand-700 hover:underline">
                  {t.label}
                </Link>
              ) : (
                <span className="min-w-0 break-words font-semibold text-ink-700">{t.label}</span>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
