import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore, type Store } from "@/lib/store";
import { toSafeHtml } from "@/lib/richtext";
import { identityOf, isParticipant, mineOf, isChatSeller, resolveThreadSeller, type ChatUser } from "@/lib/chat-access";

/** Participant check + seller-side fallback (listing owner / shop staff / admin). */
async function resolveViewer(
  store: Store,
  convo: { buyerId?: string; sellerId?: string; buyerPhone?: string; sellerName?: string; listingId?: string },
  id: { userId?: string; phone?: string; altPhone?: string },
  user: ChatUser
): Promise<string | null> {
  const direct = isParticipant(convo, id, user);
  if (direct) return direct;
  if (user && (await isChatSeller(store, convo, user).catch(() => false))) return user.id;
  return null;
}

/** Thread view (participant only) + marks incoming as read. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const id = identityOf(user, "")!;
  const store = getStore();
  const convo = await store.getConversation(params.id);
  if (!convo) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  // Spam/blocked threads are hidden unless ?folder=spam.
  const folder = new URL(req.url).searchParams.get("folder") ?? "";
  const spam = (await store.getSetting(`spam:${params.id}`).catch(() => null)) as { by?: string } | null;
  if (spam && folder !== "spam") return NextResponse.json({ error: "Chat is in spam." }, { status: 410 });
  const viewer = await resolveViewer(store, convo, id, user);
  if (!viewer) return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  await store.markConversationRead(params.id, viewer);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const per = Math.min(100, Math.max(1, Number(url.searchParams.get("per") ?? "50") || 50));
  const all = (await store.listMessages(params.id)).map((m) => ({
    ...m,
    bodyHtml: m.bodyHtml ?? toSafeHtml(m.body),
    mine: mineOf(m.senderId, viewer, user?.phone),
  }));
  // Recipient + contact details for the chat header: the OTHER party, not you.
  const viewerIsSeller =
    (convo.sellerId && viewer === convo.sellerId) ||
    (user?.id === viewer && user?.name === convo.sellerName);
  let peer: { name: string; phone?: string; role: string };
  if (viewerIsSeller) {
    peer = { name: convo.buyerName || "Buyer", phone: convo.buyerPhone || undefined, role: "buyer" };
  } else {
    // Heals legacy threads stored as "Seller"/"General enquiry" to the real
    // seller or shop name + contact.
    const healed = await resolveThreadSeller(store, convo).catch((): { name: string; phone?: string } => ({ name: convo.sellerName || "Seller" }));
    peer = { name: healed.name, phone: healed.phone, role: "seller" };
  }
  return NextResponse.json({ convo, messages: all.slice((page - 1) * per, page * per), total: all.length, page, per, peer });
}

/** Reply (participant only, rate-limited, sanitized). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { rateLimit, clientKey } = await import("@/lib/rate-limit");
  const rl = rateLimit(clientKey(req, "convo:reply"), { limit: 30, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down — too many messages." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { message, name } = body as { message?: string; phone?: string; name?: string };
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const id = identityOf(user, "")!;
  const plain = String(message ?? "").trim().slice(0, 2000);
  if (!plain) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  const store = getStore();
  const convo = await store.getConversation(params.id);
  if (!convo) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  const viewer = await resolveViewer(store, convo, id, user);
  if (!viewer) return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  const label = user?.name ?? name ?? convo.buyerPhone ?? "Guest";
  const rec = await store.addMessage({
    conversationId: params.id, senderId: viewer, senderLabel: label,
    body: plain, bodyHtml: toSafeHtml(plain),
  });
  // Reply-speed signal for seller ranking (Jiji-style): stamp last seller reply.
  if (user && convo.sellerId === user.id) {
    await store.setSetting(`reply_speed:${params.id}`, { at: new Date().toISOString() }).catch(() => {});
  }
  // In-app bell for the other participant (best-effort, never blocks chat).
  try {
    const { notifyUser } = await import("@/lib/notifications");
    const { toExcerpt } = await import("@/lib/richtext");
    const senderIsBuyer = viewer === convo.buyerId || (convo.buyerPhone != null && viewer === `phone:${convo.buyerPhone}`);
    const otherId = senderIsBuyer ? convo.sellerId : convo.buyerId;
    const looksLikeUser = !!otherId && !otherId.startsWith("phone:") && !otherId.startsWith("seller:") && otherId !== viewer;
    if (looksLikeUser) {
      await notifyUser({
        userId: otherId!,
        type: "message",
        title: `New message from ${label}`,
        body: `“${toExcerpt(plain, 90)}” — tap to reply.`,
        link: `/dashboard/messages/${params.id}`,
      });
    }
  } catch {}
  // Ping the other side (best-effort SMS; console in demo mode).
  try {
    const { notifyLater } = await import("@/lib/notify");
    const senderIsBuyer = viewer === convo.buyerId || (convo.buyerPhone != null && viewer === `phone:${convo.buyerPhone}`);
    if (!senderIsBuyer && convo.buyerPhone) {
      notifyLater({ channel: "sms", to: convo.buyerPhone, message: `Chap: new message from ${label} — open your inbox to read it.` });
    } else if (senderIsBuyer && convo.listingId) {
      let sellerPhone: string | undefined;
      const lid = convo.listingId;
      if (lid.startsWith("shop:")) {
        const slug = lid.slice(5);
        sellerPhone = (await store.getShopBySlug(slug).catch(() => null))?.phone;
        if (!sellerPhone) {
          const { getShop } = await import("@/data/catalog");
          sellerPhone = getShop(slug)?.phone;
        }
      } else if (lid !== "general") {
        const s = await store.getListing(lid).catch(() => null);
        sellerPhone = s?.sellerPhone || undefined;
        if (!sellerPhone) {
          const { getListing } = await import("@/data/catalog");
          sellerPhone = getListing(lid)?.sellerPhone;
        }
      }
      if (sellerPhone) notifyLater({ channel: "sms", to: sellerPhone, message: `Chap: new message from ${label} about your listing — open your inbox to reply.` });
    }
  } catch {}
  return NextResponse.json({ ok: true, id: rec.id });
}

/** Block / spam / leave a conversation (participant only). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string; phone?: string };
  const id = identityOf(user, "")!;
  const store = getStore();
  const convo = await store.getConversation(params.id);
  if (!convo) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  const viewer = await resolveViewer(store, convo, id, user);
  if (!viewer) return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  if (action === "spam") {
    await store.setSetting(`spam:${params.id}`, { by: viewer, at: new Date().toISOString() }).catch(() => {});
    return NextResponse.json({ ok: true, folder: "spam" });
  }
  if (action === "unspam") {
    await store.setSetting(`spam:${params.id}`, null).catch(() => {});
    return NextResponse.json({ ok: true, folder: "inbox" });
  }
  if (action === "block") {
    const other = convo.buyerId === viewer ? convo.sellerId : convo.buyerId;
    if (other) {
      const cur = ((await store.getSetting(`blocked:${viewer}`).catch(() => null)) as string[] | null) ?? [];
      if (!cur.includes(other)) await store.setSetting(`blocked:${viewer}`, [...cur, other]).catch(() => {});
    }
    return NextResponse.json({ ok: true, blocked: true });
  }
  if (action === "unblock") {
    const other = convo.buyerId === viewer ? convo.sellerId : convo.buyerId;
    const cur = ((await store.getSetting(`blocked:${viewer}`).catch(() => null)) as string[] | null) ?? [];
    await store.setSetting(`blocked:${viewer}`, cur.filter((x) => x !== other)).catch(() => {});
    return NextResponse.json({ ok: true, blocked: false });
  }
  if (action === "read-all") {
    await store.markConversationRead(params.id, viewer).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/** Leave/delete own view of a conversation (participant only). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const id = identityOf(user, "")!;
  const store = getStore();
  const convo = await store.getConversation(params.id);
  if (!convo) return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  const viewer = await resolveViewer(store, convo, id, user);
  if (!viewer) return NextResponse.json({ error: "Not your chat." }, { status: 403 });
  await store.setSetting(`left:${params.id}:${viewer}`, { at: new Date().toISOString() }).catch(() => {});
  return NextResponse.json({ ok: true });
}
