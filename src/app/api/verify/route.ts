import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Verification requests. ID/business documents are uploaded via /api/upload
 * with private=1 (stored outside public/, never linkable). Request stores only
 * the private pointer; admins view docs through the admin-only doc endpoint.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `verify:${user.id}`), { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { kind, docPath, fileName } = body as { kind?: string; docPath?: string; fileName?: string };
  if (!["id", "business"].includes(kind ?? "")) {
    return NextResponse.json({ error: "Choose verification type: ID or business." }, { status: 400 });
  }
  if (!docPath || !docPath.startsWith("private:")) {
    return NextResponse.json({ error: "Upload your document first (JPG/PNG/WebP, ≤5MB)." }, { status: 400 });
  }
  const rec = await getStore().createVerification({
    userId: user.id,
    kind: kind!,
    docPath,
    fileName: (fileName ?? "document").slice(0, 120),
  });
  return NextResponse.json({ ok: true, id: rec.id, status: rec.status });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const all = await getStore().listVerifications();
  return NextResponse.json({ items: all.filter((v) => v.userId === user.id) });
}
