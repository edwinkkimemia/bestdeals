import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizePlan, goldRequiredMessage } from "@/lib/plans";

/**
 * Staff accounts — Gold plan only. The shop owner invites sellers by email;
 * staff can then manage the shop's catalogue. Owners can't remove themselves
 * while they're the last owner.
 */
async function shopContext(shopSlug: string, userId: string, role: string) {
  const store = getStore();
  const shop = await store.getShopBySlug(shopSlug).catch(() => null);
  if (!shop) return { error: "Shop not found.", status: 404 as const };
  const members = await store.listShopMembers(shopSlug).catch(() => []);
  const mine = members.find((m) => m.userId === userId);
  const isOwner = role === "ADMIN" || shop.ownerId === userId || mine?.role === "owner";
  return { shop, members, mine, isOwner };
}

/** List staff (owner, staff or admin of the shop). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const shopSlug = String(req.nextUrl.searchParams.get("shopSlug") ?? "").trim();
  if (!shopSlug) return NextResponse.json({ error: "shopSlug required." }, { status: 400 });
  const ctx = await shopContext(shopSlug, user.id, user.role);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!ctx.isOwner && !ctx.mine) return NextResponse.json({ error: "Shop members only." }, { status: 403 });
  return NextResponse.json({ members: ctx.members });
}

/** Invite a seller as staff (owner or admin, Gold shop) — email token flow. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { shopSlug, email, accept, token } = body as { shopSlug?: unknown; email?: unknown; accept?: boolean; token?: string };
  const store = getStore();
  // Accept an invite with a token (invited seller, must be signed in as that email).
  if (accept && token) {
    const inv = (await store.getSetting(`staff_invite:${String(token)}`).catch(() => null)) as { shopSlug?: string; email?: string; exp?: number } | null;
    if (!inv?.shopSlug || !inv.email || !inv.exp || Date.now() > inv.exp) {
      return NextResponse.json({ error: "Invite expired. Ask the owner to resend." }, { status: 410 });
    }
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      return NextResponse.json({ error: "This invite is for a different email." }, { status: 403 });
    }
    const member = await store.addShopMember(inv.shopSlug, user.id, "staff");
    await store.setSetting(`staff_invite:${String(token)}`, null).catch(() => {});
    return NextResponse.json({ ok: true, member });
  }
  const slug = String(shopSlug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "shopSlug required." }, { status: 400 });
  const ctx = await shopContext(slug, user.id, user.role);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!ctx.isOwner) return NextResponse.json({ error: "Only the shop owner can invite staff." }, { status: 403 });
  if (normalizePlan((ctx.shop as { planId?: unknown }).planId) !== "gold") {
    return NextResponse.json({ error: goldRequiredMessage("Staff accounts"), code: "PLAN_GOLD" }, { status: 403 });
  }
  const clean = String(email ?? "").trim().toLowerCase();
  if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return NextResponse.json({ error: "Staff email required." }, { status: 400 });
  const found = await store.findUserByEmail(clean).catch(() => null);
  // Registered seller → add immediately (back-compat); unregistered → token invite.
  if (found) {
    if (found.id === user.id) return NextResponse.json({ error: "You're already on this shop." }, { status: 400 });
    const member = await store.addShopMember(slug, found.id, "staff");
    return NextResponse.json({ ok: true, member });
  }
  const { uid } = await import("@/lib/utils");
  const inviteToken = uid("inv").replace(/[^a-z0-9]/gi, "").slice(0, 24);
  await store.setSetting(`staff_invite:${inviteToken}`, { shopSlug: slug, email: clean, by: user.id, exp: Date.now() + 7 * 86400_000 }).catch(() => {});
  const { notifyLater } = await import("@/lib/notify");
  notifyLater({ channel: "email", to: clean, subject: `Join ${ctx.shop.name} on Chap`, message: `You've been invited to staff ${ctx.shop.name}. Register with this email, then accept: /dashboard/shop?invite=${inviteToken}` });
  return NextResponse.json({ ok: true, inviteToken, message: "Invite sent — they join after registering with that email." });
}

/** Remove a staff member (owner or admin). The last owner can't be removed. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { shopSlug, userId } = body as { shopSlug?: unknown; userId?: unknown };
  const slug = String(shopSlug ?? "").trim();
  const target = String(userId ?? "").trim();
  if (!slug || !target) return NextResponse.json({ error: "shopSlug and userId required." }, { status: 400 });
  const ctx = await shopContext(slug, user.id, user.role);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!ctx.isOwner) return NextResponse.json({ error: "Only the shop owner can remove staff." }, { status: 403 });
  const targetRec = ctx.members.find((m) => m.userId === target);
  if (!targetRec) return NextResponse.json({ error: "Not a member of this shop." }, { status: 404 });
  if (targetRec.role === "owner" && ctx.members.filter((m) => m.role === "owner").length <= 1) {
    return NextResponse.json({ error: "You can't remove the last owner. Transfer ownership first." }, { status: 400 });
  }
  await getStore().removeShopMember(slug, target);
  return NextResponse.json({ ok: true });
}
