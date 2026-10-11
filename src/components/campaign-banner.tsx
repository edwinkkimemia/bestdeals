"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatKES } from "@/lib/format";

type Coupon = { code: string; value: number; minSpend: number };

/** Homepage campaign strip: top live coupon with tap-to-copy + shop CTA. */
export function CampaignBanner() {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/coupons")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const items = (j?.items ?? []) as Coupon[];
        if (items.length > 0) setCoupon(items[0]);
      })
      .catch(() => null);
  }, []);

  if (!coupon) return null;
  return (
    <div className="bg-accent-500 text-white">
      <div className="container-bd flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[13px] font-semibold">
        <span>
          🎉 Use code <span className="font-mono font-extrabold tracking-wide">{coupon.code}</span> — {formatKES(coupon.value)} off
          {coupon.minSpend > 0 && <> orders above {formatKES(coupon.minSpend)}</>}
        </span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(coupon.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
          className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold hover:bg-white/30"
        >
          {copied ? "Copied ✓" : "Copy code"}
        </button>
        <Link href="/shop" className="underline underline-offset-2 hover:no-underline">Shop now →</Link>
      </div>
    </div>
  );
}
