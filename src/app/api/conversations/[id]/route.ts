import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { toSafeHtml } from "@/lib/richtext";

function identityOf(user: { id: string; phone: string } | null, phone: string) {
  return user ? { userId: user.id, phone: user.phone } : /^(\+254|0)[17]\d{8}$/.test(phone) ? { phone } : null;
}

type Convo = { buyerId?: string; sellerId?: string; buyerPhone?: string; sellerName?: string };

function isParticipant(
  c: Convo,
  id: { userId?: string; phone?: string },
  user?: { id: string; name: string; role: string } | null
): string | null {
  if (id.userId && (c.buyerId === id.userId || c.sellerId === id.userId)) return id.userId;
  if (id.phone && (c.buyerPhone === id.phone || c.buyerId === `phone:${id.phone}`)) return `phone:${id.phone}`;
  // Signed-in seller whose display name matches the listing's seller, plus admins.
  if (user && (user.name === c.sellerName || user.role === "ADMIN")) return user.id;
  return null;
}

/** Thread view (participant only) + marks incoming as read. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const user = await currentUser().catch(() => null);
  const id = identityOf(user, phone);
  if (!id) return NextResponse.json({ error: "Sign in or provide your phone." }, { status: 401 });
  const store = getStore();
  const convo = await store.getConversation(params.id);
  if (!convo) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  const viewer = isParticipant(convo, id, user);
  if (!viewer) return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  await store.markConversationRead(params.id, viewer);
  const messages = (await store.listMessages(params.id)).map((m) => ({
    ...m,
    bodyHtml: m.bodyHtml ?? toSafeHtml(m.body),
    mine: m.senderId === viewer,
  }));
  return NextResponse.json({ convo, messages });
}

/** Reply (participant only, rate-limited, sanitized). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { rateLimit, clientKey } = await import("@/lib/rate-limit");
  const rl = rateLimit(clientKey(req, "convo:reply"), { limit: 30, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down — too many messages." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { message, phone, name } = body as { message?: string; phone?: string; name?: string };
  const user = await currentUser().catch(() => null);
  const id = identityOf(user, phone ?? "");
  if (!id) return NextResponse.json({ error: "Sign in or provide your phone." }, { status: 401 });
  const plain = String(message ?? "").trim().slice(0, 2000);
  if (!plain) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  const store = getStore();
  const convo = await store.getConversation(params.id);
  if (!convo) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  const viewer = isParticipant(convo, id, user);
  if (!viewer) return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  const label = user?.name ?? name ?? convo.buyerPhone ?? "Guest";
  const rec = await store.addMessage({
    conversationId: params.id, senderId: viewer, senderLabel: label,
    body: plain, bodyHtml: toSafeHtml(plain),
  });
  return NextResponse.json({ ok: true, id: rec.id });
}
