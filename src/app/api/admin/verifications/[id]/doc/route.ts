import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { currentUser } from "@/lib/auth";
import { privateBaseDir, isS3Configured } from "@/lib/storage";

const mimeFor = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
};

/**
 * Admin-only: stream a private verification document. Never publicly
 * linkable. `?dl=1` downloads (attachment) instead of inline viewing.
 * Reads from DB staging, S3, then local disk — in that order — so docs stay
 * reachable after redeploys no matter which backend stored them.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { getStore } = await import("@/lib/store");
  const { logAudit } = await import("@/lib/audit");
  const all = await getStore().listVerifications();
  const v = all.find((x) => x.id === params.id);
  if (!v?.docPath || !v.docPath.startsWith("private:")) {
    return NextResponse.json({ error: "No document attached." }, { status: 404 });
  }
  const asAttachment = new URL(req.url).searchParams.get("dl") === "1";
  const fileName = (v.fileName ?? "document").replace(/"/g, "");
  const disposition = `${asAttachment ? "attachment" : "inline"}; filename="${fileName}"`;
  const serve = async (bytes: Uint8Array<ArrayBuffer>, mime: string) => {
    await logAudit({ actorId: user.id, actorEmail: user.email, action: asAttachment ? "verify.doc_download" : "verify.doc_view", entity: "verification", entityId: v.id }).catch(() => {});
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  };
  const rel = v.docPath.slice("private:".length).replace(/[^a-zA-Z0-9\-_./]/g, "");
  if (rel.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  // DB-staged docs (serverless without S3) live in shared storage, not /tmp.
  if (rel.startsWith("db/")) {
    const { readDbDoc } = await import("@/lib/privdocs");
    const staged = await readDbDoc(await getStore(), v.docPath).catch(() => null);
    if (!staged) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    return serve(new Uint8Array(staged.bytes), staged.mime);
  }
  // Object storage (S3 private prefix) — previously never attempted, so every
  // S3-hosted doc 404'd here even though the upload succeeded.
  if (isS3Configured()) {
    try {
      const { s3Get } = await import("@/lib/storage");
      const remote = await s3Get(`private/${rel}`);
      if (remote) return serve(new Uint8Array(remote), mimeFor(rel));
    } catch {}
  }
  try {
    const buf = await readFile(join(privateBaseDir(), rel));
    return serve(new Uint8Array(buf), mimeFor(rel));
  } catch {
    return NextResponse.json({ error: "Document not found on this server." }, { status: 404 });
  }
}
