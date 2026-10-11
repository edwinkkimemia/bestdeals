/**
 * Client-safe watermark helpers (no Node imports — safe to bundle for the
 * browser). Heavy lifting (sharp) lives in ./watermark-server.
 */

/**
 * Display URL that serves the watermarked bytes, so right-click → save
 * downloads the marked image. Local data-URIs and blank sources pass through.
 */
export function wmImageSrc(src: string, download = false): string {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return `/api/images/download?src=${encodeURIComponent(src)}${download ? "&dl=1" : ""}`;
}
