import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** Admin-only: approve/reject a verification. Approval marks the user verified. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { id, approve, shopSlug } = body as { id?: string; approve?: boolean; shopSlug?: string };
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const store = getStore();
  await store.decideVerification(id, approve === true, user.id);
  const v = (await store.listVerifications()).find((x) => x.id === id);
  if (approve === true && v) {
    await store.setUserVerified(v.userId, true);
    if (shopSlug) await store.setShopVerified(shopSlug, true).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
