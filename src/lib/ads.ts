/**
 * Google AdSense wiring. Everything is inert until NEXT_PUBLIC_ADSENSE_ID is
 * set (components render nothing), so unapproved domains ship zero ad code.
 * Ads never render on transactional/account pages (checkout, cart, auth,
 * dashboard, admin, orders, wishlist, sell, pricing) — policy + conversion.
 */

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || "";

export function adsEnabled(): boolean {
  return ADSENSE_CLIENT_ID.startsWith("ca-pub-");
}

/** Display-unit ids from the AdSense account (empty = that placement stays off). */
export const AD_SLOTS = {
  feed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED || "",
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE || "",
  anchor: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR || "",
};

const DENIED_PREFIXES = [
  "/checkout",
  "/cart",
  "/dashboard",
  "/admin",
  "/auth",
  "/orders",
  "/wishlist",
  "/sell",
  "/pricing",
  "/advertising",
  "/verify",
];

/** Pure path check (no env) — deny-listed transactional/account routes. */
export function isPathAllowed(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  const p = pathname.toLowerCase().split("?")[0];
  return !DENIED_PREFIXES.some((d) => p === d || p.startsWith(`${d}/`));
}

/** False on deny-listed routes (or when AdSense isn't configured at all). */
export function adsAllowedOn(pathname: string | null | undefined): boolean {
  if (!adsEnabled()) return false;
  return isPathAllowed(pathname);
}

export type AdsConsent = "personalized" | "non-personalized";

const CONSENT_KEY = "chap_ads_consent";

/** Stored consent choice, or null when the visitor hasn't chosen yet. */
export function getAdsConsent(): AdsConsent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "personalized" || v === "non-personalized" ? v : null;
  } catch {
    return null;
  }
}

export function setAdsConsent(mode: AdsConsent): void {
  try {
    localStorage.setItem(CONSENT_KEY, mode);
  } catch {}
  try {
    window.dispatchEvent(new Event("chap:ads-consent"));
  } catch {}
}
