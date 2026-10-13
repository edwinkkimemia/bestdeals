/**
 * Shared allow-list for listing/product image URLs.
 * - https://… external links
 * - /uploads/… local-disk uploads (single-server dev)
 * - /api/files/… serverless uploads (Vercel /tmp, served via API)
 *
 * These MUST stay in sync everywhere: the upload response, the sell/edit
 * form, and the POST/PUT listings APIs. They drifted once — /api/files/
 * uploads were silently stripped by the APIs, so product photos "never
 * uploaded" on serverless. Single source of truth now.
 */
export function isAllowedListingImage(u: string): boolean {
  return (
    typeof u === "string" &&
    u.length >= 1 &&
    u.length <= 2000 &&
    (u.startsWith("https://") || u.startsWith("/uploads/") || u.startsWith("/api/files/"))
  );
}

/** Filter + cap a raw image list for storage (max 8). */
export function normalizeListingImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((u): u is string => isAllowedListingImage(u)).slice(0, 8);
}

/** Parse the comma/newline-separated links box in the sell/edit form. */
export function parseImageLinks(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => isAllowedListingImage(s));
}
