import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { uid, slugify } from "@/lib/utils";
import { uploadsBaseDir, privateBaseDir, uploadPublicUrl, isServerlessUploads } from "@/lib/storage";

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

  if ((process.env.UPLOAD_DRIVER || "local") === "s3") {
    return NextResponse.json(
      { error: "File storage is not configured right now. Try again later." },
      { status: 501 }
    );
  }

  const stamp = new Date().toISOString().slice(0, 7);
  const urls: string[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    const name = `${Date.now().toString(36)}-${uid("f").slice(-6)}${slugify(f.name.replace(/\.[^.]+$/, "")).slice(0, 24)}${EXT[f.type]}`;
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
