// SERVER-ONLY: sharp + node builtins must never enter the client bundle
// (Vercel build fails on node:crypto/sharp in client code). Client components
// may only import from ./watermark (pure helpers). No `server-only` import:
// it throws under plain-node test runs.
import sharp from "sharp";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { WATERMARK_VERSION } from "./watermark";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
/** Logo sits bottom-center; modest size so the photo stays the hero. */
const LOGO_WIDTH_RATIO = 0.38;
const LOGO_OPACITY = 0.6;

/** Stable disk-cache filename for a source URL (content-addressed + versioned). */
export function wmCacheKey(src: string): string {
  return `${createHash("sha256").update(src).digest("hex").slice(0, 32)}.${WATERMARK_VERSION}.bin`;
}

let logoCache: Buffer | null = null;

async function logoBuffer(): Promise<Buffer> {
  if (!logoCache) {
    logoCache = await readFile(join(process.cwd(), "public", "chaplogo.png"));
  }
  return logoCache;
}

/** chaplogo.png faded to watermark opacity, scaled to `targetWidth`. */
async function fadedLogo(targetWidth: number): Promise<Buffer> {
  const resized = sharp(await logoBuffer()).resize(Math.max(1, Math.round(targetWidth)));
  const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += info.channels) {
    data[i] = Math.round(data[i] * LOGO_OPACITY);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

function textPillSvg(w: number, h: number): Buffer {
  const pillW = Math.round(Math.min(300, w * 0.34));
  const pillH = Math.max(22, Math.round(pillW * 0.3));
  const pad = Math.max(8, Math.round(w * 0.025));
  const fontSize = Math.round(pillH * 0.4);
  const x = w - pillW - pad;
  const y = h - pillH - pad;
  return Buffer.from(
    `<svg width="${w}" height="${h}">` +
      `<rect x="${x}" y="${y}" width="${pillW}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="rgba(0,67,210,0.85)"/>` +
      `<text x="${x + pillW / 2}" y="${y + pillH / 2}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">chap.co.ke</text>` +
      `</svg>`
  );
}

/**
 * Bake the Chap logo into a product photo — large, centered, faded.
 * Falls back to the text pill when the logo file is unavailable (e.g.
 * serverless runtimes without public/ on disk). Format-preserving
 * (jpeg/png/webp); anything else passes through untouched. Never throws —
 * callers fall back to the original buffer.
 */
export async function watermarkBuffer(input: Buffer): Promise<Buffer> {
  try {
    const img = sharp(input).rotate();
    const meta = await img.metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) return input;
    const w = meta.width ?? 800;
    const h = meta.height ?? 600;
    if (w < 120 || h < 80) return input;

    try {
      const logo = await fadedLogo(w * LOGO_WIDTH_RATIO);
      const lm = await sharp(logo).metadata();
      const lw = lm.width ?? w;
      const lh = lm.height ?? h;
      const left = Math.max(0, Math.round((w - lw) / 2));
      const pad = Math.max(8, Math.round(h * 0.03));
      const top = Math.max(0, h - lh - pad);
      return await img.composite([{ input: logo, left, top }]).toBuffer();
    } catch {
      return await img.composite([{ input: textPillSvg(w, h) }]).toBuffer();
    }
  } catch {
    return input;
  }
}

/** Content type for a watermarked buffer (sniffed, defaults to jpeg). */
export function sniffContentType(buf: Buffer): string {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return "image/jpeg";
}
