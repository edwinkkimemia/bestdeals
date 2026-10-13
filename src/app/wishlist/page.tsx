"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getListing } from "@/data/catalog";
import { getWishlist } from "@/components/ui/wishlist-button";
import { ListingCard } from "@/components/ui/listing-card";

export default function WishlistPage() {
  const [ids, setIds] = useState<string[]>([]);
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
  const items = ids.map(getListing).filter(Boolean);

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">Wishlist ({items.length})</h1>
      {items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">Nothing saved yet</p>
          <p className="text-sm text-ink-500">Tap the heart on any listing to save it here.</p>
          <Link href="/shop" className="btn-primary mt-4">Discover products</Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((l) => <ListingCard key={l!.id} listing={l!} />)}
        </div>
      )}
    </div>
  );
}
