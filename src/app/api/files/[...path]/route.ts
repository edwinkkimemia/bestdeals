import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { uploadsBaseDir } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves serverless uploads from ephemeral /tmp storage (Vercel has no persistent disk). */
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const parts = params.path ?? [];
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
