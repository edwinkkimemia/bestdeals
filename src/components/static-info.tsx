import type { ReactNode } from "react";

export type StaticInfoItem = {
  title: string;
  description: ReactNode;
};

/**
 * One-line-per-item replacement for the old three-card explainer grids.
 * Keeps the guidance but leaves the page to products and listings.
 */
export function StaticInfo({
  items,
  numbered = false,
  className = "",
}: {
  items: StaticInfoItem[];
  numbered?: boolean;
  className?: string;
}) {
  return (
    <ul className={`grid gap-x-6 gap-y-1.5 text-xs leading-relaxed text-ink-500 sm:grid-cols-3 ${className}`}>
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-1.5">
          <span aria-hidden className="shrink-0 font-bold text-brand-600">
            {numbered ? `${i + 1}.` : "·"}
          </span>
          <span>
            <span className="font-semibold text-ink-700">{item.title}</span>
            {" — "}
            {item.description}
          </span>
        </li>
      ))}
    </ul>
  );
}
