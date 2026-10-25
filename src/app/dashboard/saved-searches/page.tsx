"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Bookmark, Search, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/format";

type Saved = {
  id: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
  lastAlertAt?: string;
  sourceListingId?: string;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function queryHref(query: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const k of ["q", "category", "subcategory", "county", "town", "min", "max", "condition", "type", "sort"] as const) {
    const v = query[k];
    if (v == null || v === "" || v === "all") continue;
    p.set(k, String(v));
  }
  const qs = p.toString();
  return `/search${qs ? `?${qs}` : ""}`;
}

function Summary({ query }: { query: Record<string, unknown> }) {
  const chips = [
    str(query.q) && `“${str(query.q).slice(0, 30)}”`,
    str(query.category) && str(query.category) !== "all" && str(query.category),
    str(query.subcategory) && str(query.subcategory) !== "all" && str(query.subcategory),
    str(query.town) && str(query.town) !== "all" && str(query.town),
    !str(query.town) && str(query.county) && str(query.county) !== "all" && str(query.county),
    query.max != null && query.max !== "" && `≤ ${Number(query.max).toLocaleString("en-KE")}`,
    query.min != null && query.min !== "" && `≥ ${Number(query.min).toLocaleString("en-KE")}`,
  ].filter(Boolean) as string[];
  if (chips.length === 0) return <span className="text-xs text-ink-400">Whole marketplace</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span key={c} className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
          {c}
        </span>
      ))}
    </span>
  );
}

export default function SavedPage() {
  const [items, setItems] = useState<Saved[]>([]);
  const [ready, setReady] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Merge any hearts made as a guest before loading the unified list.
      let local: string[] = [];
      try {
        local = JSON.parse(localStorage.getItem("bd_wishlist_v1") || "[]");
      } catch {}
      try {
        const wr = await fetch("/api/wishlist", { cache: "no-store" });
        const wj = wr.ok ? await wr.json() : { items: [] };
        const server: string[] = Array.isArray(wj.items) ? wj.items : [];
        const merged = [...new Set([...local, ...server])].slice(0, 500);
        const changed = merged.length !== local.length || merged.some((id, i) => id !== local[i]);
        if (changed) {
          try {
            localStorage.setItem("bd_wishlist_v1", JSON.stringify(merged));
          } catch {}
          window.dispatchEvent(new Event("bd:wishlist"));
        }
        const missing = local.filter((id) => !server.includes(id));
        if (missing.length > 0) {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: missing }),
          }).catch(() => {});
        }
      } catch {}

      try {
        const r = await fetch("/api/saved-searches", { cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        setItems(Array.isArray(j?.items) ? j.items : []);
      } catch {
        setItems([]);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const remove = async (item: Saved) => {
    setDeleting(item.id);
    try {
      await fetch(`/api/saved-searches?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      // Product-based saved searches are backed by the heart. Keep the header
      // count and the guest fallback in sync when the server removes the heart.
      if (item.sourceListingId) {
        try {
          const local = JSON.parse(localStorage.getItem("bd_wishlist_v1") || "[]") as string[];
          localStorage.setItem(
            "bd_wishlist_v1",
            JSON.stringify(local.filter((id) => id !== item.sourceListingId))
          );
        } catch {}
        window.dispatchEvent(new Event("bd:wishlist"));
      }
    } catch {}
    setDeleting(null);
  };

  return (
    <div>
      <h1 className="section-title flex items-center gap-2">
        <Bookmark className="h-6 w-6 text-brand-600" /> Saved searches
        {items.length > 0 && <span className="text-base font-semibold text-ink-400">({items.length})</span>}
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-500">
        Your saved searches live here. Hearting a product automatically saves a search for similar items — new
        matches, price drops and alerts all feed the bell <BellRing className="inline h-3.5 w-3.5" /> and push notifications.
      </p>

      {!ready ? (
        <p className="mt-6 text-sm text-ink-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-brand-600" />
          <p className="mt-2 font-bold">No saved searches yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Search for a product and tap “Get alerts for this search”, or use the heart on any listing.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/search" className="btn-primary">Search the marketplace</Link>
            <Link href="/browse" className="btn-secondary">Browse products</Link>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{s.name}</strong>
                <span className="mt-1 block"><Summary query={s.query ?? {}} /></span>
                <span className="mt-1 block text-[11px] text-ink-400">
                  Saved {timeAgo(s.createdAt)}
                  {s.lastAlertAt ? ` · last alert ${timeAgo(s.lastAlertAt)}` : " · no alerts yet"}
                  {s.sourceListingId ? " · from a hearted product" : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Link href={queryHref(s.query ?? {})} className="btn-secondary !py-1.5 text-xs">
                  View results
                </Link>
                <button
                  onClick={() => remove(s)}
                  disabled={deleting === s.id}
                  aria-label={`Delete ${s.name}`}
                  className="rounded-lg p-2 text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
