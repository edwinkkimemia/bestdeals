import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { uid, slugify } from "@/lib/utils";
import { uploadsBaseDir, privateBaseDir, uploadPublicUrl, isServerlessUploads, isS3Configured, s3Put } from "@/lib/storage";
import { isDbConfigured } from "@/lib/db";
import { getStore } from "@/lib/store";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * File storage. S3 auto-enables when S3_BUCKET + keys exist (see
 * docs/providers.md); otherwise single-server writes to public/uploads and
 * serverless stages public images in the shared DB so avatars/logos/covers
 * survive redeploys (ephemeral /tmp alone would 404 after the next deploy).
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "upload"), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });

  // Every caller (listing form, profile/shop header, verification docs, blog
  // admin) is signed in — anonymous uploads can no longer fill durable
  // shared storage (DB rows survive redeploys; per-instance /tmp did not).
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No file." }, { status: 400 });
  const isPrivate = form.get("private") === "1";
  const files = form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 8);
  if (files.length === 0) return NextResponse.json({ error: "No files selected." }, { status: 400 });
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return NextResponse.json({ error: `Rejected ${f.name}: use JPG/PNG/WebP.` }, { status: 415 });
    if (f.size > MAX) return NextResponse.json({ error: `Rejected ${f.name}: over 5MB.` }, { status: 413 });
  }

  const useS3 = isS3Configured();
  if ((process.env.UPLOAD_DRIVER || "").trim().toLowerCase() === "s3" && !useS3) {
    return NextResponse.json(
      { error: "File storage is not configured right now. Try again later." },
      { status: 501 }
    );
  }

  const stamp = new Date().toISOString().slice(0, 7);
  const urls: string[] = [];
  for (const f of files) {
    let buf = Buffer.from(await f.arrayBuffer());
    // Harden: strip EXIF + cap dimensions via sharp (best-effort, keeps original type).
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buf).rotate();
      const meta = await img.metadata();
      if ((meta.width ?? 0) > 2400) img.resize({ width: 2400, withoutEnlargement: true });
      buf = await img.withMetadata({ exif: {} }).toBuffer();
    } catch {}
    // Minimal executable-content guard: reject files with script signatures.
    const head = buf.slice(0, 256).toString("latin1").toLowerCase();
    if (head.includes("<script") || head.includes("<?php")) {
      return NextResponse.json({ error: `Rejected ${f.name}: invalid image.` }, { status: 415 });
    }
    const name = `${Date.now().toString(36)}-${uid("f").slice(-6)}${slugify(f.name.replace(/\.[^.]+$/, "")).slice(0, 24)}${EXT[f.type]}`;
    if (useS3) {
      const key = isPrivate ? `private/${stamp}/${name}` : `public/${stamp}/${name}`;
      try {
        const url = await s3Put(key, buf, f.type);
        urls.push(isPrivate ? `private:${stamp}/${name}` : url);
      } catch {
        return NextResponse.json({ error: "Upload failed. Try again later." }, { status: 502 });
      }
      continue;
    }
    if (isPrivate) {
      // Serverless without S3 shares nothing but the database: stage bytes in
      // the shared store so the verify POST + admin viewer on any instance
      // can reach them. Disk stays for local dev / single-server, S3 above.
      if (!useS3 && isServerlessUploads()) {
        const { stageDbDoc } = await import("@/lib/privdocs");
        const ref = await stageDbDoc(getStore(), {
          name, stamp, mime: f.type, base64: buf.toString("base64"), by: user.id,
        });
        if (!ref) return NextResponse.json({ error: "Upload failed. Try a smaller photo." }, { status: 502 });
        urls.push(ref);
        continue;
      }
      // Never web-served: only readable via the admin verification endpoint.
      const dir = join(privateBaseDir(), stamp);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, name), buf);
      urls.push(`private:${stamp}/${name}`);
    } else {
      // Serverless without S3: /tmp is wiped on redeploy, so stage the bytes
      // in the shared store and hand out a durable /api/files/db/… URL.
      // Survives redeploys whenever DATABASE_URL is set; without a database
      // nothing can survive a restart (demo memory), and /api/health says so.
      if (isServerlessUploads()) {
        let staged = buf;
        let outName = name;
        let outMime = f.type;
        // Keep DB rows small: recompress oversized photos before staging —
        // but only when it actually shrinks (a noisy PNG can grow as JPEG).
        if (staged.length > 1_200_000) {
          try {
            const sharp = (await import("sharp")).default;
            const smaller = await sharp(staged)
              .rotate()
              .resize({ width: 1600, withoutEnlargement: true })
              .jpeg({ quality: 78, mozjpeg: true })
              .toBuffer();
            if (smaller.length < staged.length) {
              staged = smaller;
              // Name carries the correct extension already (EXT[f.type]); only
              // the JPEG recompress changes the bytes' format — and the name.
              outName = name.replace(/\.[^.]+$/, ".jpg");
              outMime = "image/jpeg";
            }
          } catch {}
        }
        const { stageDbPubImage } = await import("@/lib/pubimages");
        const b64 = staged.toString("base64");
        const ref = await stageDbPubImage(getStore(), {
          name: outName,
          stamp,
          mime: outMime,
          base64: b64,
          by: user.id,
        });
        if (ref) {
          urls.push(ref);
          continue;
        }
        // DB staging failed (too large or no shared DB): don't hand out an
        // ephemeral /tmp URL that 404s after the next deploy — fail loudly.
        if (b64.length > 2_200_000) {
          return NextResponse.json(
            { error: `Rejected ${f.name}: too large without file storage — configure S3 (docs/providers.md).` },
            { status: 413 }
          );
        }
      }
      const dir = join(uploadsBaseDir(), stamp);
      await mkdir(dir, { recursive: true });
      // Store the original: the watermark is applied on serve (single mark
      // for every source, no doubles, no legacy gaps).
      await writeFile(join(dir, name), buf);
      urls.push(uploadPublicUrl(stamp, name));
    }
  }
  // DB-staged bytes only survive when there IS a shared database — without
  // DATABASE_URL the settings store is per-instance memory, as ephemeral as
  // /tmp. Private staged docs (`private:db/…`) count as durable on the same
  // terms as public `/api/files/db/…` URLs.
  const dbBacked = (u: string) => u.startsWith("/api/files/db/") || u.startsWith("private:db/");
  const durable =
    useS3 ||
    !isServerlessUploads() ||
    (isDbConfigured() && urls.length > 0 && urls.every((u) => dbBacked(u) || u.startsWith("https://")));
  return NextResponse.json({
    ok: true,
    urls,
    ...(durable ? {} : { note: "Serverless uploads are ephemeral — configure S3 for production (docs/providers.md)." }),
  });
}

/** Delete own upload (public only; private docs are admin-retained). */
export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "");
  // DB-backed durable images (serverless without S3): drop the staged bytes.
  // Ownership mirrors the private-doc check — only the uploader (or an
  // admin) may delete; anonymous-era rows (empty `by`) keep prior behavior.
  if (url.startsWith("/api/files/db/")) {
    const { dbPubImageKey } = await import("@/lib/pubimages");
    const key = dbPubImageKey(url);
    if (!key) return NextResponse.json({ error: "Only your uploaded images can be deleted." }, { status: 400 });
    try {
      const rec = (await getStore().getSetting(key).catch(() => null)) as { by?: string } | null;
      if (rec && typeof rec.by === "string" && rec.by && rec.by !== user.id && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Not yours." }, { status: 403 });
      }
      await getStore().deleteSetting(key);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Delete failed." }, { status: 500 });
    }
  }
  const m = url.match(/^\/(uploads|api\/files)\/(\d{4}-\d{2})\/([^/]+)$/);
  if (!m) return NextResponse.json({ error: "Only your uploaded images can be deleted." }, { status: 400 });
  const [, , stamp, name] = m;
  if (name.includes("..") || stamp.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  try {
    const p = join(uploadsBaseDir(), stamp, name);
    if (existsSync(p)) await unlink(p);
    // S3 public objects: best-effort note (deletes need IAM; admin purges periodically).
    if (isS3Configured()) {
      await getStore().setSetting(`deleted_upload:${stamp}/${name}`, { by: user.id, at: new Date().toISOString() }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
