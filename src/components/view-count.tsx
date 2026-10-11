"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

/** Real view counter shown on public listing pages (hidden until > 0). */
export function ViewCount({ listingId }: { listingId: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/analytics/track?listingId=${encodeURIComponent(listingId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d && typeof d.views === "number" && d.views > 0) setViews(d.views);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [listingId]);
  if (views === null) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-ink-400" aria-label={`${views} views`}>
      <Eye className="h-3.5 w-3.5" /> {views.toLocaleString()} view{views === 1 ? "" : "s"}
    </p>
  );
}
