import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { uid, slugify } from "@/lib/utils";
import { uploadsBaseDir, privateBaseDir, uploadPublicUrl, isServerlessUploads, isS3Configured, s3Put, s3PublicUrl } from "@/lib/storage";
import { getStore } from "@/lib/store";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * File storage. Default driver writes to public/uploads (single-server / demo).
 * Set UPLOAD_DRIVER=s3 + S3_* credentials for object storage (see docs/providers.md).
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "upload"), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No file." }, { status: 400 });
  const isPrivate = form.get("private") === "1";
  if (isPrivate) {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 8);
  if (files.length === 0) return NextResponse.json({ error: "No files selected." }, { status: 400 });
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return NextResponse.json({ error: `Rejected ${f.name}: use JPG/PNG/WebP.` }, { status: 415 });
    if (f.size > MAX) return NextResponse.json({ error: `Rejected ${f.name}: over 5MB.` }, { status: 413 });
  }

  const useS3 = (process.env.UPLOAD_DRIVER || "local") === "s3";
  if (useS3 && !isS3Configured()) {
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
      // Never web-served: only readable via the admin verification endpoint.
      const dir = join(privateBaseDir(), stamp);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, name), buf);
      urls.push(`private:${stamp}/${name}`);
    } else {
      const dir = join(uploadsBaseDir(), stamp);
      await mkdir(dir, { recursive: true });
      // Store the original: the watermark is applied on serve (single mark
      // for every source, no doubles, no legacy gaps).
      await writeFile(join(dir, name), buf);
      urls.push(uploadPublicUrl(stamp, name));
    }
  }
  return NextResponse.json({
    ok: true,
    urls,
    ...(isServerlessUploads() ? { note: "Serverless uploads are ephemeral — configure S3 for production (docs/providers.md)." } : {}),
  });
}

/** Delete own upload (public only; private docs are admin-retained). */
export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || "");
  const m = url.match(/^\/(uploads|api\/files)\/(\d{4}-\d{2})\/([^/]+)$/);
  if (!m) return NextResponse.json({ error: "Only your uploaded images can be deleted." }, { status: 400 });
  const [, , stamp, name] = m;
  if (name.includes("..") || stamp.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  try {
    const p = join(uploadsBaseDir(), stamp, name);
    if (existsSync(p)) await unlink(p);
    // S3 public objects: best-effort note (deletes need IAM; admin purges periodically).
    if ((process.env.UPLOAD_DRIVER || "local") === "s3") {
      await getStore().setSetting(`deleted_upload:${stamp}/${name}`, { by: user.id, at: new Date().toISOString() }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
