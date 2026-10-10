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
