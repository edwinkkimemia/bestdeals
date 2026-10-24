"use client";

import { useEffect, useRef } from "react";
import { getAnalyticsConsent } from "@/lib/consent";

/**
 * Fires one product-view hit per listing page load — only with analytics
 * consent (cookie banner). Client-side dedupe (same tab session, 30 min)
 * prevents StrictMode double-mounts and refresh spam from inflating numbers
 * — the server dedupes per visitor too.
 */
export function ViewTracker({ listingId }: { listingId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    const track = () => {
      if (sent.current || getAnalyticsConsent() !== true) return;
      sent.current = true;
      try {
        const key = `bd_viewed_${listingId}`;
        const last = Number(sessionStorage.getItem(key) ?? "0");
        if (Date.now() - last < 30 * 60 * 1000) return;
        sessionStorage.setItem(key, String(Date.now()));
      } catch {
        // Private mode — still count server-side (deduped per visitor cookie).
      }
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
        keepalive: true,
      }).catch(() => {});
    };
    track();
    // Accepting cookies on this very page should count the view too.
    window.addEventListener("chap:consent", track);
    return () => window.removeEventListener("chap:consent", track);
  }, [listingId]);
  return null;
}
