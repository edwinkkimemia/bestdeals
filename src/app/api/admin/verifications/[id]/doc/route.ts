import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { currentUser } from "@/lib/auth";

/** Admin-only: stream a private verification document. Never publicly linkable. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { getStore } = await import("@/lib/store");
  const all = await getStore().listVerifications();
  const v = all.find((x) => x.id === params.id);
  if (!v?.docPath || !v.docPath.startsWith("private:")) {
    return NextResponse.json({ error: "No document attached." }, { status: 404 });
  }
  const rel = v.docPath.slice("private:".length).replace(/[^a-zA-Z0-9\-_./]/g, "");
  if (rel.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  try {
    const buf = await readFile(join(process.cwd(), ".data", "private", rel));
    const ext = rel.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${(v.fileName ?? "document").replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Document not found on this server (demo storage is per-instance)." }, { status: 404 });
  }
}
