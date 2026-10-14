import { tmpdir } from "os";
import { join } from "path";

/**
 * Writable storage locations. Local dev / single-server: public/uploads +
 * .data/private (git-ignored). Vercel serverless has a read-only filesystem
 * except /tmp, so uploads there are ephemeral — pair with S3 for production
 * (see docs/providers.md).
 */
const onVercel = Boolean(process.env.VERCEL);

export function uploadsBaseDir(): string {
  return onVercel ? join(tmpdir(), "chap", "uploads") : join(process.cwd(), "public", "uploads");
}

export function privateBaseDir(): string {
  return onVercel ? join(tmpdir(), "chap", "private") : join(process.cwd(), ".data", "private");
}

/** Public URL for a stored upload (served from /api/files on serverless). */
export function uploadPublicUrl(stamp: string, name: string): string {
  return onVercel ? `/api/files/${stamp}/${name}` : `/uploads/${stamp}/${name}`;
}

/** Disk cache for watermarked renditions (git-ignored; ephemeral on serverless). */
export function wmCacheDir(): string {
  return onVercel ? join(tmpdir(), "chap", "wmcache") : join(process.cwd(), ".data", "wmcache");
}

export function isServerlessUploads(): boolean {
  return onVercel;
}

export function isS3Configured(): boolean {
  const driver = (process.env.UPLOAD_DRIVER || "").trim().toLowerCase();
  // Explicit opt-out always wins (local/ephemeral even if keys exist).
  if (driver === "local") return false;
  const hasKeys = Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
  // Auto-enable when keys exist so setting S3_* alone is enough; explicit
  // UPLOAD_DRIVER=s3 keeps working for backwards compatibility.
  if (driver === "s3") return hasKeys;
  return hasKeys;
}



export function s3PublicUrl(key: string): string {
  const bucket = process.env.S3_BUCKET || "chap-media";
  const region = process.env.S3_REGION || "eu-west-1";
  const endpoint = (process.env.S3_ENDPOINT || "").replace(/\/$/, "");
  if (endpoint) return `${endpoint}/${bucket}/${key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/** Shared SigV4 signer (no SDK dep). Returns the URL + authorized headers. */
async function s3Sign(method: "PUT" | "GET", key: string, contentType?: string, payloadHash?: string): Promise<{ url: string; headers: Record<string, string> }> {
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION || "eu-west-1";
  const access = process.env.S3_ACCESS_KEY!;
  const secret = process.env.S3_SECRET_KEY!;
  const endpoint = (process.env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`).replace(/\/$/, "");
  const url = `${endpoint}/${bucket}/${key}`;
  const { createHash, createHmac } = await import("crypto");
  const now = new Date();
  const amz = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const day = amz.slice(0, 8);
  // GETs carry no body: UNSIGNED-PAYLOAD is the standard anonymous-hash marker.
  const hash = payloadHash ?? "UNSIGNED-PAYLOAD";
  const headers: Record<string, string> = {
    host: new URL(url).host,
    "x-amz-content-sha256": hash,
    "x-amz-date": amz,
    ...(contentType ? { "content-type": contentType } : {}),
  };
  const signed = Object.keys(headers).sort().join(";");
  const canonical = [method, `/${bucket}/${key}`, "", ...Object.keys(headers).sort().map((k) => `${k}:${headers[k]}`), "", signed, hash].join("\n");
  const scope = `${day}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amz, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
  const kDate = createHmac("sha256", `AWS4${secret}`).update(day).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kSvc = createHmac("sha256", kRegion).update("s3").digest();
  const kSign = createHmac("sha256", kSvc).update("aws4_request").digest();
  const sig = createHmac("sha256", kSign).update(toSign).digest("hex");
  return {
    url,
    headers: { ...headers, Authorization: `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signed}, Signature=${sig}` },
  };
}

/** Minimal S3 PUT via SigV4 (no SDK dep). Throws on misconfig/HTTP error. */
export async function s3Put(key: string, body: Buffer, contentType: string): Promise<string> {
  const { createHash } = await import("crypto");
  const hash = createHash("sha256").update(body).digest("hex");
  const { url, headers } = await s3Sign("PUT", key, contentType, hash);
  const r = await fetch(url, {
    method: "PUT",
    headers,
    body: new Uint8Array(body),
  });
  if (!r.ok) throw new Error(`S3 upload failed (${r.status})`);
  return s3PublicUrl(key);
}

/**
 * Signed S3 GET for private verification docs. Returns null when the object
 * is gone (404); throws on misconfig/transport errors. Without this, admin
 * doc viewing only worked for disk/DB docs — S3-hosted docs 404'd.
 */
export async function s3Get(key: string): Promise<Buffer | null> {
  const { url, headers } = await s3Sign("GET", key);
  const r = await fetch(url, { method: "GET", headers });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`S3 download failed (${r.status})`);
  const ab = await r.arrayBuffer();
  if (ab.byteLength === 0) return null;
  return Buffer.from(ab);
}
