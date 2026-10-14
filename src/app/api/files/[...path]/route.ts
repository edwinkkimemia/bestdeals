import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { uploadsBaseDir } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * Warm-instance cache for DB-backed images: every view otherwise pays a full
 * settings-row read + base64 decode (shop logos/covers render raw, not via
 * the watermark endpoint's disk cache). Bounded and TTL'd; safe to lose.
 */
const dbCache = new Map<string, { bytes: Uint8Array<ArrayBuffer>; mime: string; exp: number }>();
const DB_CACHE_MAX = 50;
const DB_CACHE_TTL_MS = 10 * 60_000;

function dbCacheGet(url: string): { bytes: Uint8Array<ArrayBuffer>; mime: string } | null {
  const hit = dbCache.get(url);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    dbCache.delete(url);
    return null;
  }
  // Refresh recency.
  dbCache.delete(url);
  dbCache.set(url, hit);
  return hit;
}

function dbCacheSet(url: string, bytes: Uint8Array<ArrayBuffer>, mime: string) {
  if (dbCache.size >= DB_CACHE_MAX) {
    const oldest = dbCache.keys().next().value;
    if (oldest !== undefined) dbCache.delete(oldest);
  }
  dbCache.set(url, { bytes, mime, exp: Date.now() + DB_CACHE_TTL_MS });
}

/**
 * Serves serverless uploads. `/api/files/db/…` URLs are DB-backed and survive
 * redeploys (see src/lib/pubimages.ts); plain `/api/files/<stamp>/<name>`
 * URLs remain ephemeral /tmp reads for backwards compatibility.
 */
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const parts = params.path ?? [];
  // Anything under /api/files/db/ that isn't exactly the 3-segment staged
  // shape is rejected up front — never a disk probe.
  if (parts[0] === "db") {
    if (parts.length !== 3) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const url = `/api/files/db/${parts[1]}/${parts[2]}`;
    const { dbPubImageKey } = await import("@/lib/pubimages");
    if (!dbPubImageKey(url)) return NextResponse.json({ error: "Not found." }, { status: 404 });
    try {
      const cached = dbCacheGet(url);
      if (cached) {
        return new NextResponse(cached.bytes, {
          headers: {
            "Content-Type": cached.mime,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
      const { getStore } = await import("@/lib/store");
      const { readDbPubImage } = await import("@/lib/pubimages");
      const hit = await readDbPubImage(getStore(), url);
      if (!hit) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const bytes = new Uint8Array(hit.bytes);
      dbCacheSet(url, bytes, hit.mime);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": hit.mime,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  }
  if (parts.length !== 2 || parts.some((p) => !/^[a-zA-Z0-9][a-zA-Z0-9\-_.]*$/.test(p) || p.includes(".."))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const buf = await readFile(join(uploadsBaseDir(), parts[0], parts[1]));
    const ext = parts[1].split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
