import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, basename } from "path";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { uploadsBaseDir, wmCacheDir } from "@/lib/storage";
import { watermarkBuffer, sniffContentType, wmCacheKey } from "@/lib/watermark";

const MAX_FETCH = 8 * 1024 * 1024;

function respond(buf: Buffer, name: string, asAttachment: boolean, immutable: boolean) {
  const safe = `chap-${basename(name).replace(/[^A-Za-z0-9._-]/g, "_") || "photo.jpg"}`;
  // NextResponse with Buffer: pass a Uint8Array copy for correct typing.
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": sniffContentType(buf),
      ...(asAttachment ? { "Content-Disposition": `attachment; filename="${safe}"` } : {}),
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=86400",
    },
  });
}

/**
 * Serve any product photo with the chap.co.ke watermark baked in — uploads,
 * image links, and seed photos alike. Renditions persist to a versioned disk
 * cache on first request, so traffic spikes never re-composite.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "img:dl"), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many downloads. Try again shortly." }, { status: 429 });
  const src = (new URL(req.url).searchParams.get("src") ?? "").trim();
  if (!src) return NextResponse.json({ error: "Missing image." }, { status: 400 });
  // Inline by default so the URL works as an <img> src (right-click saves
  // the watermarked bytes); ?dl=1 forces a download attachment instead.
  const asAttachment = new URL(req.url).searchParams.get("dl") === "1";

  // Versioned disk cache: same source URL always maps to the same file.
  const cacheFile = join(wmCacheDir(), wmCacheKey(src));
  try {
    const hit = await readFile(cacheFile);
    if (hit.length > 0) return respond(hit, "photo.jpg", asAttachment, true);
  } catch {}

  let buf: Buffer | null = null;
  let name = "photo.jpg";
  try {
    if (src.startsWith("/uploads/") || src.startsWith("/api/files/")) {
      const rel = src.replace(/^\/uploads\//, "").replace(/^\/api\/files\//, "");
      if (!rel || rel.includes("..") || /[^A-Za-z0-9._/-]/.test(rel)) {
        return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
      }
      const base = uploadsBaseDir();
      const file = join(base, rel);
      if (!file.startsWith(base)) return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
      buf = await readFile(file);
      name = basename(rel);
    } else if (/^https:\/\//i.test(src)) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const r = await fetch(src, { signal: ctrl.signal });
        if (!r.ok) return NextResponse.json({ error: "Could not fetch image." }, { status: 422 });
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.startsWith("image/")) return NextResponse.json({ error: "Not an image." }, { status: 422 });
        const ab = await r.arrayBuffer();
        if (ab.byteLength > MAX_FETCH) return NextResponse.json({ error: "Image too large." }, { status: 413 });
        buf = Buffer.from(ab);
        try {
          name = basename(new URL(src).pathname) || name;
        } catch {}
      } finally {
        clearTimeout(timer);
      }
    } else {
      return NextResponse.json({ error: "Only site uploads and https image links can be downloaded." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Could not read image." }, { status: 422 });
  }
  if (!buf) return NextResponse.json({ error: "Could not read image." }, { status: 422 });

  const stamped = await watermarkBuffer(buf);
  // Persist for future hits — best-effort, never fails the response.
  try {
    await mkdir(wmCacheDir(), { recursive: true });
    await writeFile(cacheFile, stamped);
  } catch {}
  return respond(stamped, name, asAttachment, false);
}
