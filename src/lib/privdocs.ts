/**
 * Private verification documents that survive serverless multi-instance.
 *
 * Local dev / single-server keeps files on disk (`private:<stamp>/<name>`).
 * Vercel functions share nothing but the database: without S3, an upload
 * written to instance A's /tmp is invisible to the verify POST and the admin
 * doc viewer on instance B ("Document upload not found"). So on serverless
 * without S3, private uploads are staged as base64 in the shared settings
 * store and referenced as `private:db/<stamp>/<name>` — durable across
 * instances, readable only via the admin doc endpoint (same as disk docs).
 * S3 refs (`private:<stamp>/<name>` with UPLOAD_DRIVER=s3) are untouched.
 */
import type { Store } from "./store";

export const DB_DOC_PREFIX = "private:db/";

/** Max base64 payload (~5MB file + slack). The upload route caps files at 5MB. */
const MAX_B64 = 7_500_000;

export function isDbDocRef(ref: unknown): boolean {
  return typeof ref === "string" && ref.startsWith(DB_DOC_PREFIX);
}

/**
 * Settings key for a db doc ref, or null when the ref is malformed.
 * Inner path is restricted to the `<yyyy-mm>/<file>` shape the upload route
 * generates — no `..`, no absolute paths, bounded length.
 */
export function dbDocKey(ref: string): string | null {
  if (!isDbDocRef(ref)) return null;
  const inner = ref.slice(DB_DOC_PREFIX.length);
  if (!inner || inner.length > 120 || inner.includes("..")) return null;
  if (!/^\d{4}-\d{2}\/[A-Za-z0-9\-_]+[.][A-Za-z0-9]+$/.test(inner)) return null;
  return `privdoc:${inner}`;
}

export type StagedDoc = { mime: string; base64: string; by: string; at: string };

/** Persist an uploaded private doc; returns the `private:db/…` ref. */
export async function stageDbDoc(
  store: Store,
  opts: { name: string; stamp: string; mime: string; base64: string; by: string }
): Promise<string | null> {
  if (!opts.by || !opts.base64 || opts.base64.length > MAX_B64) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(opts.mime)) return null;
  const ref = `${DB_DOC_PREFIX}${opts.stamp}/${opts.name}`;
  const key = dbDocKey(ref);
  if (!key) return null;
  const doc: StagedDoc = { mime: opts.mime, base64: opts.base64, by: opts.by, at: new Date().toISOString() };
  await store.setSetting(key, doc);
  return ref;
}

/** Load a staged doc (ownership is checked by the caller). */
export async function readDbDoc(
  store: Store,
  ref: string
): Promise<{ mime: string; bytes: Buffer; by: string } | null> {
  const key = dbDocKey(ref);
  if (!key) return null;
  const rec = (await store.getSetting(key).catch(() => null)) as StagedDoc | null;
  if (!rec || typeof rec.base64 !== "string" || !rec.base64) return null;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(rec.base64, "base64");
  } catch {
    return null;
  }
  if (bytes.length === 0) return null;
  return { mime: rec.mime || "image/jpeg", bytes, by: typeof rec.by === "string" ? rec.by : "" };
}
