import { NextRequest, NextResponse } from "next/server";
import { currentUser, createSessionToken, SESSION_COOKIE, sessionCookieAttrs } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Update own profile (display name + phone + public photo). Phone change re-queues verification. */
export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `profile:${user.id}`), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many updates. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { name, phone, photoUrl } = body as { name?: string; phone?: string; photoUrl?: string | null };
  if (name !== undefined && (name.trim().length < 2 || name.trim().length > 80)) {
    return NextResponse.json({ error: "Name must be 2–80 characters." }, { status: 400 });
  }
  if (phone !== undefined && !/^(\+254|0)[17]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Use a valid Kenyan phone e.g. 0712345678." }, { status: 400 });
  }
  if (photoUrl !== undefined && photoUrl !== null && photoUrl !== "") {
    const ok =
      typeof photoUrl === "string" &&
      photoUrl.length <= 2000 &&
      (photoUrl.startsWith("https://") || photoUrl.startsWith("/uploads/") || photoUrl.startsWith("/api/files/"));
    if (!ok) return NextResponse.json({ error: "Photo must be an uploaded image (JPG/PNG/WebP)." }, { status: 400 });
  }
  const store = getStore();
  const before = await store.findUserById(user.id).catch(() => null);
  const patch: { name?: string; phone?: string; photoUrl?: string | null } = { name, phone };
  if (photoUrl !== undefined) patch.photoUrl = photoUrl ? photoUrl : null;
  const updated = await store.updateUser(user.id, patch);
  if (!updated) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  // Re-verify on phone change: the verified number snapshot must match the account.
  let reverify = false;
  if (phone && before && phone !== before.phone && updated.verified) {
    await store.setUserVerified(updated.id, false).catch(() => {});
    updated.verified = false;
    reverify = true;
  }
  // Re-issue the session cookie so header/dashboard show the new name/phone immediately.
  const token = await createSessionToken({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    verified: updated.verified,
  });
  const res = NextResponse.json({ ok: true, name: updated.name, phone: updated.phone, photoUrl: updated.photoUrl ?? null, ...(reverify ? { reverify: true, message: "Number changed — re-verify at /dashboard/verify to keep posting." } : {}) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieAttrs());
  return res;
}

/** Export my data (Data Protection Act, 2019 — access right). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const data = await getStore().exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="chap-data-export-${user.id}.json"`,
    },
  });
}

/** Delete my account. Requires typed confirmation. Transactional records are anonymised, not erased. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }
  await getStore().deleteUserAccount(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
