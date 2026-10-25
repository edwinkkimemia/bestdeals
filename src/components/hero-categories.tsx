"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CATEGORIES, type Category } from "@/data/catalog";
import { CategoryIcon } from "@/components/category-icon";
import { slugify } from "@/lib/utils";

/**
 * Desktop hero category nav: hover or tap a category to reveal its
 * subcategories in a flyout — every row navigates (subcategory → filtered
 * search, category → its page).
 */
export function HeroCategories({ categories = CATEGORIES }: { categories?: Category[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  // A short grace period lets the pointer cross the gap from a row into its
  // flyout. Without it, lower rows close the submenu before mobile-speed
  // cursor travel can reach it.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 280);
  };

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav
      aria-label="Categories"
      className="relative hidden w-60 shrink-0 self-start rounded-2xl border border-neutral-200 bg-white p-2 shadow-card lg:block"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Browse by category</p>
      <ul>
        {categories.slice(0, 12).map((c) => {
          const isOpen = open === c.slug;
          return (
            <li key={c.slug} className="relative">
              <div
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium ${isOpen ? "bg-sand-100 text-brand-700" : "text-ink-700"}`}
                onMouseEnter={() => {
                  cancelClose();
                  setOpen(c.slug);
                }}
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

              {isOpen && c.subcategories.length > 0 && (
                <div
                  className="absolute left-full top-0 z-50 ml-2 max-h-[min(70vh,32rem)] w-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg"
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  <Link
                    href={`/browse/${c.slug}`}
                    className="block rounded-xl px-2.5 py-2 text-[13px] font-bold text-brand-700 hover:bg-brand-50"
                  >
                    All {c.name} →
                  </Link>
                  <ul className="mt-1">
                    {c.subcategories.map((sub) => (
                      <li key={sub}>
                        <Link
                          href={`/browse/${c.slug}/${slugify(sub)}`}
                          className="block rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-700 hover:bg-sand-100 hover:text-brand-700"
                        >
                          {sub}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/browse" className="mt-1 block rounded-xl px-2.5 py-2 text-[13px] font-bold text-brand-700 hover:bg-brand-50">
        View all {categories.length} categories →
      </Link>
    </nav>
  );
}
