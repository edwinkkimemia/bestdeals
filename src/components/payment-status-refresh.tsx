"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type SellerPlanState = { pending?: unknown };
type ShopPlanState = { pending?: Record<string, unknown> };

/**
 * Watches the pending-plan rows while the seller is in the dashboard. When a
 * Daraja callback clears one, refresh the server components so the page flips
 * to the paid plan without the seller hunting for a refresh button.
 */
export function PaymentStatusRefresh() {
  const router = useRouter();
  const last = useRef<{ seller: boolean; shops: string[] } | null>(null);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (stopped || (typeof document !== "undefined" && document.hidden)) return;
      try {
        const [a, b] = await Promise.all([
          fetch("/api/account/plan", { cache: "no-store" }).catch(() => null),
          fetch("/api/shops/plan", { cache: "no-store" }).catch(() => null),
        ]);
        if (!a?.ok || !b?.ok) return;
        const seller = (await a.json()) as SellerPlanState;
        const shops = (await b.json()) as ShopPlanState;
        const sellerPending = !!seller.pending;
        const shopPending = Object.entries(shops.pending ?? {})
          .filter(([, value]) => !!value)
          .map(([slug]) => slug);
        const prev = last.current;
        if (prev) {
          const sellerCleared = prev.seller && !sellerPending;
          const shopCleared = prev.shops.some((slug) => !shopPending.includes(slug));
          if (sellerCleared || shopCleared) router.refresh();
        }
        last.current = { seller: sellerPending, shops: shopPending };
      } catch {}
    };
    void poll();
    const t = setInterval(poll, 10_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [router]);

  return null;
}
