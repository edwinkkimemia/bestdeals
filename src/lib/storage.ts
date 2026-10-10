import { tmpdir } from "os";
import { join } from "path";

/**
 * Writable storage locations. Local dev / single-server: public/uploads +
 * .data/private (git-ignored). Vercel serverless has a read-only filesystem
 * except /tmp, so uploads there are ephemeral — pair with S3 for production
 * (see docs/providers.md). UPLOAD_DRIVER=s3 still returns 501 until wired.
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

export function isServerlessUploads(): boolean {
  return onVercel;
}
