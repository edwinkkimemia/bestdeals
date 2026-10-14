/**
 * Cookie consent (DPA/GDPR): analytics tracking + advertising share one
 * decision point. Session auth cookies are strictly necessary and never
 * gated. Choice persists on-device (localStorage for client gating) plus a
 * `chap_consent=a1|a0` cookie the server can read for the visitor cookie.
 */
import { setAdsConsent as setAdsChoice, type AdsConsent } from "./ads";

const ANALYTICS_KEY = "chap_consent_analytics";
export const CONSENT_COOKIE = "chap_consent";

/** Analytics choice, or null when the visitor hasn't decided yet. */
export function getAnalyticsConsent(): boolean | null {
  try {
    const v = localStorage.getItem(ANALYTICS_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

/** Persist analytics + ads choices (cookies notice "Accept all" / "Essential only"). */
export function setConsent(analytics: boolean, ads: AdsConsent): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, analytics ? "1" : "0");
  } catch {}
  setAdsChoice(ads);
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${analytics ? "a1" : "a0"}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  } catch {}
  try {
    window.dispatchEvent(new Event("chap:consent"));
  } catch {}
}
