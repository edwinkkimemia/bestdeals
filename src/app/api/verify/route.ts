import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Verification requests: national ID for individuals; business permit PLUS
 * owner ID for businesses (two documents, two queue records).
 * The phone must MATCH the account phone — it becomes the seller's public
 * WhatsApp contact, so the number buyers reach is the number we verified.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `verify:${user.id}`), { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { kind, docPath, fileName, phone, docPath2, fileName2 } = body as {
    kind?: string; docPath?: string; fileName?: string; phone?: string;
    docPath2?: string; fileName2?: string;
  };
  if (!["id", "business"].includes(kind ?? "")) {
    return NextResponse.json({ error: "Choose verification type: ID or business." }, { status: 400 });
  }
  const store = getStore();
  const fresh = await store.findUserById(user.id).catch(() => null);
  const accountPhone = fresh?.phone ?? user.phone;
  if (!phone || !/^(\+254|0)[17]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Confirm a valid Kenyan phone number." }, { status: 400 });
  }
  if (phone !== accountPhone) {
    return NextResponse.json(
      { error: "That number doesn't match your account phone. Update it in Profile first, so listings and WhatsApp use one verified number." },
      { status: 400 }
    );
  }
  if (!docPath || !docPath.startsWith("private:")) {
    return NextResponse.json({ error: "Upload your document first (JPG/PNG/WebP, ≤5MB)." }, { status: 400 });
  }
  if (kind === "business" && (!docPath2 || !docPath2.startsWith("private:"))) {
    return NextResponse.json({ error: "Businesses need both: the permit AND the owner ID." }, { status: 400 });
  }
  const rec = await store.createVerification({
    userId: user.id,
    kind: kind!,
    phone,
    docPath,
    fileName: (fileName ?? "document").slice(0, 120),
  });
  if (kind === "business" && docPath2) {
    // Owner ID rides as its own queue record so each document is reviewed.
    await store.createVerification({
      userId: user.id,
      kind: "id",
      phone,
      docPath: docPath2,
      fileName: (fileName2 ?? "owner-id").slice(0, 120),
    });
  }
  return NextResponse.json({ ok: true, id: rec.id, status: rec.status });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const store = getStore();
  const all = await store.listVerifications();
  const fresh = await store.findUserById(user.id).catch(() => null);
  return NextResponse.json({
    items: all.filter((v) => v.userId === user.id),
    user: {
      verified: fresh?.verified ?? user.verified,
      emailVerified: fresh?.emailVerified ?? false,
      sellerKind: fresh?.sellerKind ?? "individual",
      businessName: fresh?.businessName ?? undefined,
    },
  });
}
