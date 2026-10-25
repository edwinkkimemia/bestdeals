"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getListing } from "@/data/catalog";
import { getWishlist } from "@/components/ui/wishlist-button";
import { ListingCard } from "@/components/ui/listing-card";
import { formatKES } from "@/lib/format";
import { WmImage } from "@/components/ui/wm-image";

type StoreItem = {
  id: string; slug: string; title: string; price: number; stock: number;
  seller: string; images: string[]; txMethod: string; listingType: string;
};

function storeHref(s: StoreItem): string {
  const base = s.listingType === "classified" ? "classifieds" : s.listingType === "service" ? "services" : "product";
  return `/${base}/${s.slug}`;
}

export default function WishlistPage() {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  useEffect(() => {
    // Signed-in users have one Saved searches page. Sync guest hearts first,
    // then send them to the unified dashboard view.
    let live = true;
    (async () => {
      const me = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
      if (!me?.ok || !live) return;
      const local = getWishlist();
      if (local.length > 0) {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: local, merge: true }),
        }).catch(() => {});
      }
      router.replace("/dashboard/saved-searches");
    })();
    return () => {
      live = false;
    };
  }, [router]);
  useEffect(() => {
    const sync = () => setIds(getWishlist());
    sync();
    window.addEventListener("bd:wishlist", sync);
    // Merge local → server when signed in (cross-device sync).
    fetch("/api/wishlist").then((r) => r.json()).then((j) => {
      if (Array.isArray(j.items) && j.items.length > 0) {
        const local = getWishlist();
        const merged = [...new Set([...local, ...j.items])];
        if (merged.length !== local.length) {
          try {
            localStorage.setItem("bd_wishlist_v1", JSON.stringify(merged));
          } catch {}
          setIds(merged);
        }
        // Push local-only ids up.
        const missing = local.filter((x) => !j.items.includes(x));
        if (missing.length > 0) {
          fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: missing }) }).catch(() => {});
        }
      }
    }).catch(() => {});
    return () => window.removeEventListener("bd:wishlist", sync);
  }, []);
  // Seller-posted listings live in the store, not the static catalogue —
  // resolve them too instead of silently dropping saved hearts.
  useEffect(() => {
    const missing = ids.filter((id) => !getListing(id));
    if (missing.length === 0) {
      setStoreItems([]);
      return;
    }
    let live = true;
    fetch(`/api/listings/resolve?ids=${encodeURIComponent(missing.join(","))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live) setStoreItems(Array.isArray(j?.items) ? j.items : []);
      })
      .catch(() => {
        if (live) setStoreItems([]);
      });
    return () => {
      live = false;
    };
  }, [ids]);
  const items = ids.map(getListing).filter(Boolean);
  const total = items.length + storeItems.length;

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Saved searches ({total})</h1>
      <p className="mt-1 text-sm text-ink-500">
        Products you save become searches for similar items — price drops and new matches ring the bell 🔔 in Notifications.{" "}
        <Link href="/dashboard/saved-searches" className="link-bd">Open saved searches →</Link>
      </p>
      {total === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">No saved searches yet</p>
          <p className="text-sm text-ink-500">Tap the heart on any listing to save a search for similar items.</p>
          <Link href="/browse" className="btn-primary mt-4">Discover products</Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((l) => <ListingCard key={l!.id} listing={l!} />)}
          {storeItems.map((s) => (
            <Link key={s.id} href={storeHref(s)} className="card p-2.5">
              <WmImage src={s.images[0]} alt={s.title} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
              <p className="clamp-2 mt-2 text-sm font-normal">{s.title}</p>
              <p className="text-sm font-bold">{formatKES(s.price)}</p>
              <p className="mt-0.5 truncate text-xs text-ink-400">{s.seller}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
