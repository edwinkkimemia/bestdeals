"use client";

import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ADSENSE_CLIENT_ID,
  adsAllowedOn,
  adsEnabled,
  getAdsConsent,
  type AdsConsent,
} from "@/lib/ads";
import { getAnalyticsConsent, setConsent } from "@/lib/consent";

function useAdsConsent(): AdsConsent | null {
  const [mode, setMode] = useState<AdsConsent | null>(null);
  useEffect(() => {
    const sync = () => setMode(getAdsConsent());
    sync();
    window.addEventListener("chap:ads-consent", sync);
    return () => window.removeEventListener("chap:ads-consent", sync);
  }, []);
  return mode;
}

/**
 * Site-wide AdSense loader. The script is present on every page for account
 * verification and auto-ads; units stay non-personalized until the visitor
 * chooses "Accept all" in the consent banner.
 */
export function AdScript() {
  const mode = useAdsConsent();
  useEffect(() => {
    if (!adsEnabled()) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.requestNonPersonalizedAds = mode === "personalized" ? 0 : 1;
    } catch {}
  }, [mode]);
  return null;
}

/** Single responsive display unit. Renders nothing without a slot id. */
export function AdSlot({ slot, className }: { slot: string; className?: string }) {
  const pathname = usePathname();
  const mode = useAdsConsent();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !slot || !mode || !adsEnabled()) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {}
  }, [ready, slot, mode]);
  if (!slot || !mode || !adsAllowedOn(pathname)) return null;
  // Reserved space pre-hydration to avoid layout shift.
  if (!ready) return <div aria-hidden className={`min-h-24 bg-sand-50 ${className ?? ""}`} />;
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

/** Sponsored tile that sits inside listing grids (sized like a card). */
export function InFeedAd({ slot }: { slot: string }) {
  const pathname = usePathname();
  const mode = useAdsConsent();
  if (!slot || !mode || !adsAllowedOn(pathname)) return null;
  return (
    <div className="card flex min-h-48 flex-col overflow-hidden" aria-label="Advertisement">
      <p className="px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Sponsored</p>
      <div className="flex-1">
        <AdSlot slot={slot} className="h-full" />
      </div>
    </div>
  );
}

/** Full-width unit for article/detail flows. */
export function InArticleAd({ slot }: { slot: string }) {
  const pathname = usePathname();
  const mode = useAdsConsent();
  if (!slot || !mode || !adsAllowedOn(pathname)) return null;
  return (
    <div className="my-2" aria-label="Advertisement">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">Sponsored</p>
      <AdSlot slot={slot} />
    </div>
  );
}

/** Dismissible mobile anchor (sits above the bottom nav). Desktop: bottom bar. */
export function AnchorAd({ slot }: { slot: string }) {
  const pathname = usePathname();
  const mode = useAdsConsent();
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    try {
      if (sessionStorage.getItem("chap_ads_anchor_x") === "1") setDismissed(true);
    } catch {}
  }, []);
  if (!ready || dismissed || !slot || !mode || !adsAllowedOn(pathname)) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-neutral-200 bg-white/95 shadow-card backdrop-blur md:bottom-0" aria-label="Advertisement">
      <button
        type="button"
        aria-label="Dismiss ad"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem("chap_ads_anchor_x", "1");
          } catch {}
        }}
        className="absolute -top-3 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white text-xs font-bold text-ink-500"
      >
        ✕
      </button>
      <div className="mx-auto max-w-3xl px-2 py-1">
        <AdSlot slot={slot} />
      </div>
    </div>
  );
}

/**
 * Unified cookie banner (DPA/GDPR): analytics tracking + advertising share
 * one decision. "Accept all" enables view analytics and personalized ads;
 * "Essential only" keeps the session cookie alone (analytics off, basic
 * non-personalized ads). Persists on-device; change it anytime by clearing
 * site data. Ads copy adapts when AdSense isn't configured.
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(getAnalyticsConsent() === null);
  }, []);
  if (!show) return null;
  const choose = (analytics: boolean, ads: AdsConsent) => {
    setConsent(analytics, ads);
    setShow(false);
  };
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-0 bottom-16 z-50 p-3 md:bottom-4">
      <div className="card mx-auto max-w-xl p-4 shadow-lg">
        <p className="text-sm font-bold">Cookies & ads keep Chap free</p>
        <p className="mt-1 text-xs text-ink-500">
          We use a sign-in cookie (essential), view analytics to improve search, and
          {adsEnabled() ? " ads to fund the marketplace" : " ads to fund the marketplace (currently off)"}.
          Either way, ads never appear on checkout, payments or your account pages. See our{" "}
          <Link href="/privacy" className="link-bd">Privacy policy</Link>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => choose(true, "personalized")} className="btn-primary !px-4 !py-2 text-sm">
            Accept all
          </button>
          <button type="button" onClick={() => choose(false, "non-personalized")} className="btn-secondary !px-4 !py-2 text-sm">
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}

/** Grid helper: a sponsored tile every `frequency` cards (default 8). */
export function AdAfterEvery({ index, frequency = 8, slot }: { index: number; frequency?: number; slot: string }) {
  if ((index + 1) % frequency !== 0) return null;
  return <InFeedAd slot={slot} />;
}
