/**
 * Client-safe watermark helpers (no Node imports — safe to bundle for the
 * browser). Heavy lifting (sharp) lives in ./watermark-server.
 */

/** Bump when the logo artwork or mark style changes — busts caches + URLs. */
export const WATERMARK_VERSION = "v4";

/**
 * Display URL that serves the watermarked bytes, so right-click → save
 * downloads the marked image. Versioned (&v=) so style changes bust
 * browser/CDN caches. Local data-URIs and blank sources pass through.
 */
export function wmImageSrc(src: string, download = false): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return `/api/images/download?src=${encodeURIComponent(src)}&v=${WATERMARK_VERSION}${download ? "&dl=1" : ""}`;
}
