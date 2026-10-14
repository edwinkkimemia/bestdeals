/**
 * Durable public images for serverless without S3.
 *
 * Root cause of "profile/cover disappears on redeploy": Vercel functions only
 * have writable /tmp, which is per-instance and wiped on redeploy — but the
 * DB row keeps the /api/files/… URL, so the next deploy serves a 404.
 * Private docs already solved this via DB staging (see privdocs.ts); public
 * avatars/logos/covers get the same treatment: staged as base64 in the
 * shared settings store and served as `/api/files/db/<yyyy-mm>/<file>`.
 * Durable whenever DATABASE_URL is set (falls back to demo memory otherwise,
 * same as the rest of the store). S3 remains the choice for large batches.
 */
import type { Store } from "./store";

export const PUB_IMG_PREFIX = "/api/files/db/";

/** Cap after compression (~1.65MB bytes ≈ 2.2M base64 chars + JSON slack). */
const MAX_B64 = 2_200_000;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isDbPubImageUrl(url: unknown): boolean {
  return typeof url === "string" && url.startsWith(PUB_IMG_PREFIX);
}

/**
 * Settings key for a db public-image URL, or null when malformed.
 * Same <yyyy-mm>/<file> shape the upload route generates.
 */
export function dbPubImageKey(url: string): string | null {
  if (!isDbPubImageUrl(url)) return null;
  const inner = url.slice(PUB_IMG_PREFIX.length);
  if (!inner || inner.length > 120 || inner.includes("..")) return null;
  if (!/^\d{4}-\d{2}\/[A-Za-z0-9\-_]+[.][A-Za-z0-9]+$/.test(inner)) return null;
  return `pubimg:${inner}`;
}

export type StagedPubImage = { mime: string; base64: string; by: string; at: string };

/** Persist a public image; returns the `/api/files/db/…` URL. */
export async function stageDbPubImage(
  store: Store,
  opts: { name: string; stamp: string; mime: string; base64: string; by?: string }
): Promise<string | null> {
  if (!opts.base64 || opts.base64.length > MAX_B64) return null;
  if (!ALLOWED_MIME.has(opts.mime)) return null;
  const url = `${PUB_IMG_PREFIX}${opts.stamp}/${opts.name}`;
  const key = dbPubImageKey(url);
  if (!key) return null;
  const doc: StagedPubImage = {
    mime: opts.mime,
    base64: opts.base64,
    by: opts.by ?? "",
    at: new Date().toISOString(),
  };
  await store.setSetting(key, doc);
  return url;
}

/** Load a staged public image (public — no ownership check). */
export async function readDbPubImage(
  store: Store,
  url: string
): Promise<{ mime: string; bytes: Buffer } | null> {
  const key = dbPubImageKey(url);
  if (!key) return null;
  const rec = (await store.getSetting(key).catch(() => null)) as StagedPubImage | null;
  if (!rec || typeof rec.base64 !== "string" || !rec.base64) return null;
  // Re-validate: staged rows are writable settings, so a tampered mime must
  // never turn the files route into stored-XSS.
  const mime = ALLOWED_MIME.has(rec.mime) ? rec.mime : "image/jpeg";
  let bytes: Buffer;
  try {
    bytes = Buffer.from(rec.base64, "base64");
  } catch {
    return null;
  }
  if (bytes.length === 0) return null;
  return { mime, bytes };
}
