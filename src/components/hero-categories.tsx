"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/data/catalog";
import { CategoryIcon } from "@/components/category-icon";

/**
 * Desktop hero category nav: hover or tap a category to reveal its
 * subcategories in a flyout — every row navigates (subcategory → filtered
 * search, category → its page).
 */
export function HeroCategories() {
  const [open, setOpen] = useState<string | null>(null);
  const active = CATEGORIES.find((c) => c.slug === open);

  return (
    <nav
      aria-label="Categories"
      className="relative hidden w-60 shrink-0 self-start rounded-2xl border border-neutral-200 bg-white p-2 shadow-card lg:block"
      onMouseLeave={() => setOpen(null)}
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Browse by category</p>
      <ul>
        {CATEGORIES.slice(0, 12).map((c) => {
          const isOpen = open === c.slug;
          return (
            <li key={c.slug}>
              <div
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium ${isOpen ? "bg-sand-100 text-brand-700" : "text-ink-700"}`}
                onMouseEnter={() => setOpen(c.slug)}
              >
                <Link
                  href={`/browse/${c.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-2.5 outline-none hover:text-brand-700 focus:text-brand-700"
                  onFocus={() => setOpen(c.slug)}
                  aria-expanded={isOpen}
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="truncate">{c.name}</span>
                </Link>
                <button
                  type="button"
                  aria-label={isOpen ? `Hide ${c.name} subcategories` : `Show ${c.name} subcategories`}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : c.slug)}
                  className="rounded p-0.5 text-ink-400 hover:text-brand-700"
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/browse" className="mt-1 block rounded-xl px-2.5 py-2 text-[13px] font-bold text-brand-700 hover:bg-brand-50">
        View all {CATEGORIES.length} categories →
      </Link>

      {active && active.subcategories.length > 0 && (
        <div className="absolute left-full top-0 z-50 ml-2 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
          <Link
            href={`/browse/${active.slug}`}
            className="block rounded-xl px-2.5 py-2 text-[13px] font-bold text-brand-700 hover:bg-brand-50"
          >
            All {active.name} →
          </Link>
          <ul className="mt-1">
            {active.subcategories.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?category=${active.slug}&subcategory=${encodeURIComponent(s)}`}
                  className="block rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-700 hover:bg-sand-100 hover:text-brand-700"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
