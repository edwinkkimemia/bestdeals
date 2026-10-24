"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "bd_wishlist_v1";

export function getWishlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function WishlistButton({ id, title, className }: { id: string; title?: string; className?: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(getWishlist().includes(id));
  }, [id]);
  return (
    <button
      type="button"
      aria-label={active ? `Remove ${title ?? "item"} from wishlist` : `Save ${title ?? "item"} to wishlist`}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const list = getWishlist();
        const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        localStorage.setItem(KEY, JSON.stringify(next));
        setActive(next.includes(id));
        window.dispatchEvent(new Event("bd:wishlist"));
        // Best-effort server sync (signed-in users get cross-device wishlist).
        fetch("/api/wishlist", {
          method: next.includes(id) ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next.includes(id) ? { listingId: id } : { id }),
        }).catch(() => {});
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow transition hover:scale-105",
        active ? "text-red-600" : "text-ink-500",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", active && "fill-red-600")} />
    </button>
  );
}
