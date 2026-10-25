"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BellPlus, BellRing, Bookmark, Heart, Loader2, Search, Trash2 } from "lucide-react";
import { formatKES, timeAgo } from "@/lib/format";
import { getWishlist } from "@/components/ui/wishlist-button";
import { WmImage } from "@/components/ui/wm-image";
import { cn } from "@/lib/utils";

type Saved = {
  id: string;
  name: string;
  query: Record<string, unknown>;
  createdAt: string;
  lastAlertAt?: string;
};

type WishItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  stock?: number;
  seller: string;
  images: string[];
  txMethod?: string;
  listingType: string;
  categorySlug?: string;
  subcategory?: string;
  county?: string;
};

type AlertState = "saving" | "saved" | "error";

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

function listingHref(item: WishItem): string {
  const base = item.listingType === "classified" ? "classifieds" : item.listingType === "service" ? "services" : "product";
  return `/${base}/${item.slug}`;
}

function Summary({ query }: { query: Record<string, unknown> }) {
  const chips = [
    str(query.q) && `“${str(query.q).slice(0, 30)}”`,
    str(query.category) && str(query.category) !== "all" && str(query.category),
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
  return (
    <Suspense fallback={<p className="mt-6 text-sm text-ink-500">Loading saved items…</p>}>
      <SavedInner />
    </Suspense>
  );
}

function SavedInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const [tab, setTab] = useState<"searches" | "wishlist">(tabParam === "wishlist" ? "wishlist" : "searches");
  const [items, setItems] = useState<Saved[]>([]);
  const [ready, setReady] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [wishIds, setWishIds] = useState<string[]>([]);
  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [wishReady, setWishReady] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [alertState, setAlertState] = useState<Record<string, AlertState>>({});
  const [alertMsg, setAlertMsg] = useState("");

  useEffect(() => {
    setTab(tabParam === "wishlist" ? "wishlist" : "searches");
  }, [tabParam]);

  const changeTab = (next: "searches" | "wishlist") => {
    setTab(next);
    router.replace(`/dashboard/saved-searches?tab=${next}`, { scroll: false });
  };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/saved-searches", { cache: "no-store" });
      if (r.ok) setItems((await r.json()).items ?? []);
    } catch {}
    setReady(true);
  }, []);

  const loadWishlist = useCallback(async () => {
    const local = getWishlist();
    try {
      const r = await fetch("/api/wishlist", { cache: "no-store" });
      const j = r.ok ? await r.json() : { items: [] };
      const server = Array.isArray(j.items) ? (j.items as string[]) : [];
      const merged = [...new Set([...local, ...server])].slice(0, 500);
      const changed = merged.length !== local.length || merged.some((id, i) => id !== local[i]);
      if (changed) {
        try {
          localStorage.setItem("bd_wishlist_v1", JSON.stringify(merged));
        } catch {}
      }
      const missing = local.filter((id) => !server.includes(id));
      if (missing.length > 0) {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: missing }),
        }).catch(() => {});
      }
      setWishIds(merged);
      if (changed) window.dispatchEvent(new Event("bd:wishlist"));
    } catch {
      setWishIds(local);
    } finally {
      setWishReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    loadWishlist();
    const sync = () => loadWishlist();
    window.addEventListener("bd:wishlist", sync);
    return () => window.removeEventListener("bd:wishlist", sync);
  }, [load, loadWishlist]);

  useEffect(() => {
    if (wishIds.length === 0) {
      setWishItems([]);
      setWishLoading(false);
      return;
    }
    let live = true;
    setWishLoading(true);
    fetch(`/api/listings/resolve?ids=${encodeURIComponent(wishIds.join(","))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live) setWishItems(Array.isArray(j?.items) ? j.items : []);
      })
      .catch(() => {
        if (live) setWishItems([]);
      })
      .finally(() => {
        if (live) setWishLoading(false);
      });
    return () => {
      live = false;
    };
  }, [wishIds]);

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {}
    setDeleting(null);
  };

  const removeWish = async (id: string) => {
    const next = wishIds.filter((x) => x !== id);
    setWishIds(next);
    setWishItems((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/wishlist?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    try {
      localStorage.setItem("bd_wishlist_v1", JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event("bd:wishlist"));
  };

  const createAlert = async (item: WishItem) => {
    setAlertMsg("");
    setAlertState((prev) => ({ ...prev, [item.id]: "saving" }));
    try {
      const query: Record<string, unknown> = {};
      if (item.categorySlug) query.category = item.categorySlug;
      if (item.subcategory) query.subcategory = item.subcategory;
      if (item.price > 0) query.max = Math.ceil((item.price * 1.25) / 1000) * 1000;
      if (!item.categorySlug) query.q = item.title.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");

      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Similar to ${item.title.slice(0, 60)}`, query, alerts: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlertState((prev) => ({ ...prev, [item.id]: "error" }));
        setAlertMsg(json.error || "Could not create the alert.");
        return;
      }
      setAlertState((prev) => ({ ...prev, [item.id]: "saved" }));
      setAlertMsg(`Alert created for items similar to “${item.title.slice(0, 70)}”.`);
      await load();
    } catch {
      setAlertState((prev) => ({ ...prev, [item.id]: "error" }));
      setAlertMsg("Could not create the alert.");
    }
  };

  return (
    <div>
      <h1 className="section-title flex items-center gap-2">
        <Bookmark className="h-6 w-6 text-brand-600" /> Saved
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Your wishlist and saved searches live together here. Wishlist price drops, new matching ads and alert
        settings all feed the bell and push notifications.
      </p>

      <div className="mt-4 inline-flex rounded-xl bg-sand-100 p-1" role="tablist" aria-label="Saved items">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "searches"}
          onClick={() => changeTab("searches")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            tab === "searches" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
          )}
        >
          Saved searches ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "wishlist"}
          onClick={() => changeTab("wishlist")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            tab === "wishlist" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900"
          )}
        >
          Wishlist ({wishIds.length})
        </button>
      </div>

      {tab === "searches" ? (
        !ready ? (
          <p className="mt-6 text-sm text-ink-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="card mt-4 p-8 text-center">
            <Search className="mx-auto h-10 w-10 text-brand-600" />
            <p className="mt-2 font-bold">No saved searches yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
              Search for an iPhone, a bedsitter in Kiambu, or a Fielder under KSh 1.2M — then tap “Get alerts for this search”.
            </p>
            <Link href="/search" className="btn-primary mt-4">Search the marketplace</Link>
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
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Link href={queryHref(s.query ?? {})} className="btn-secondary !py-1.5 text-xs">
                    View results
                  </Link>
                  <button
                    onClick={() => remove(s.id)}
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
        )
      ) : !wishReady || wishLoading ? (
        <p className="mt-6 text-sm text-ink-500">Loading wishlist…</p>
      ) : wishItems.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <Heart className="mx-auto h-10 w-10 text-brand-600" />
          <p className="mt-2 font-bold">No saved products yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Tap the heart on any listing to save it. You can then create an alert for similar items.
          </p>
          <Link href="/browse" className="btn-primary mt-4">Discover products</Link>
        </div>
      ) : (
        <>
          {alertMsg && (
            <p role="status" className="mt-3 rounded-xl bg-sand-50 px-4 py-3 text-sm text-ink-700">
              {alertMsg}
            </p>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {wishItems.map((item) => {
              const state = alertState[item.id];
              return (
                <li key={item.id} className="card overflow-hidden">
                  <Link href={listingHref(item)} className="flex gap-3 p-3">
                    <WmImage
                      src={item.images[0]}
                      alt={item.title}
                      loading="lazy"
                      className="h-24 w-24 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="clamp-2 block text-sm font-semibold leading-snug">{item.title}</span>
                      <span className="mt-1 block text-base font-bold">{formatKES(item.price)}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-400">
                        {item.seller}
                        {item.county ? ` · ${item.county}` : ""}
                      </span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 border-t border-neutral-100 p-2.5">
                    <button
                      type="button"
                      onClick={() => createAlert(item)}
                      disabled={state === "saving" || state === "saved"}
                      className={cn(
                        "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                        state === "saved"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-brand-600/30 text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                      )}
                    >
                      {state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellPlus className="h-3.5 w-3.5" />}
                      {state === "saving" ? "Creating…" : state === "saved" ? "Alert saved" : state === "error" ? "Retry alert" : "Alert me about similar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeWish(item.id)}
                      aria-label={`Remove ${item.title} from wishlist`}
                      className="rounded-lg p-2 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-4 text-xs text-ink-400">
        New matching ads, price drops and wishlist cuts ring the bell <BellRing className="inline h-3.5 w-3.5" /> and can also be delivered by browser push.
      </p>
    </div>
  );
}
