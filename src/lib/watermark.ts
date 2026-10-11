/**
 * Client-safe watermark helpers (no Node imports — safe to bundle for the
 * browser). Heavy lifting (sharp) lives in ./watermark-server.
 */

/** Bump when the logo artwork or mark style changes — busts caches + URLs. */
export const WATERMARK_VERSION = "v5";

/**
 * Display URL that serves the watermarked bytes, so right-click → save
 * downloads the marked image. Versioned (&v=) so style changes bust
 * browser/CDN caches. Brand assets, data-URIs and blanks pass through —
 * the logo must never watermark itself.
 */
export function wmImageSrc(src: string, download = false): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (src === "/chaplogo.png" || src === "/fav.png") return src;
  return `/api/images/download?src=${encodeURIComponent(src)}&v=${WATERMARK_VERSION}${download ? "&dl=1" : ""}`;
}
