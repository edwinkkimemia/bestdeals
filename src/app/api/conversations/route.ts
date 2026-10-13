import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { toSafeHtml, toExcerpt } from "@/lib/richtext";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { notifyLater } from "@/lib/notify";

const startSchema = z.object({
  listingId: z.string().min(1).max(80).default("general"),
  message: z.string().min(1).max(2000),
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/).optional(),
  /** Direct message to a specific account (e.g. from a seller profile page). */
  toUserId: z.string().min(1).max(80).optional(),
});

/** Start a conversation (signed-in only) about a listing, shop or user. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "convo:new"), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many new chats. Wait a bit." }, { status: 429 });
  const parsed = startSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a message (max 2000 chars)." }, { status: 400 });
  const d = parsed.data;

  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const name = user.name;
  const phone = user.phone;

  const plain = d.message.trim();
  if (!plain) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });

  const store = getStore();
  const { getListing, getShop } = await import("@/data/catalog");
  const catalog = getListing(d.listingId);
  const stored = !catalog && d.listingId !== "general" && !d.listingId.startsWith("shop:") ? await store.getListing(d.listingId) : null;
  // Shop chats (`shop:<slug>` from storefront Message buttons) resolve the real shop name.
  let shopName: string | undefined;
  let shopPhone: string | undefined;
  if (d.listingId.startsWith("shop:")) {
    const slug = d.listingId.slice(5);
    const demoShop = getShop(slug);
    const storedShop = await store.getShopBySlug(slug).catch(() => null);
    shopName = storedShop?.name ?? demoShop?.name;
    shopPhone = storedShop?.phone ?? demoShop?.phone;
  }
  const title = shopName ? `Shop enquiry: ${shopName}` : (catalog?.title ?? stored?.title ?? "General enquiry");
  const seller = shopName ?? catalog?.sellerName ?? stored?.sellerName ?? "Seller";

  const viewerId = user.id;
  // Direct target (seller profile "Message seller") wins over name matching.
  let sellerId: string | undefined;
  let directName: string | undefined;
  if (d.toUserId) {
    const target = await store.findUserById(d.toUserId).catch(() => null);
    if (!target) return NextResponse.json({ error: "That seller no longer exists." }, { status: 404 });
    if (target.id === user.id) return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
    sellerId = target.id;
    directName = target.businessName || target.name;
  }
  // Link the seller side via exact display-name match (name + businessName).
  if (!sellerId) {
    try {
      const hit = await store.findUserByDisplayName(seller).catch(() => null);
      sellerId = hit?.id;
    } catch {}
  }
  // Blocked participants can't open new threads with each other on the same listing.
  try {
    const blocked = ((await store.getSetting(`blocked:${viewerId}`).catch(() => null)) as string[] | null) ?? [];
    if (sellerId && blocked.includes(sellerId)) {
      return NextResponse.json({ error: "You blocked this seller." }, { status: 403 });
    }
  } catch {}
  // WhatsApp-style: same buyer + seller + listing reuses the one thread —
  // the message lands in it instead of spawning a duplicate chat.
  try {
    const existing = await store.findConversationMatch({
      buyerIds: [viewerId, `phone:${user.phone}`],
      sellerId,
      sellerName: directName ?? seller,
      listingId: d.listingId,
    });
    if (existing) {
      await store.addMessage({
        conversationId: existing.id, senderId: viewerId, senderLabel: name,
        body: plain, bodyHtml: toSafeHtml(plain),
      });
      return NextResponse.json({ ok: true, id: existing.id, reused: true });
    }
  } catch {}
  const convo = await store.createConversation({
    listingId: d.listingId,
    listingTitle: directName && d.listingId === "general" ? "Direct message" : title,
    sellerName: directName ?? seller,
    sellerId,
    buyerId: viewerId,
    buyerName: name,
    buyerPhone: phone,
    firstMessage: { senderId: viewerId, senderLabel: name, body: plain, bodyHtml: toSafeHtml(plain) },
  });
  notifyLater({ channel: "sms", to: phone, message: `Chap: chat opened with ${seller} — "${toExcerpt(plain, 80)}"` });
  return NextResponse.json({ ok: true, id: convo.id });
}

/** My inbox — signed-in only. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const store = getStore();
  const items = await store.listConversations({ userId: user.id, phone: user.phone, sellerName: user.name });
  // Heal legacy threads stored as "Seller" before shop-chat naming existed.
  const { resolveThreadSeller } = await import("@/lib/chat-access");
  for (const c of items) {
    const nm = (c.sellerName || "").trim().toLowerCase();
    if ((!nm || nm === "seller") && c.listingId && c.listingId !== "general") {
      const h = await resolveThreadSeller(store, c).catch(() => null);
      if (h && h.name.toLowerCase() !== "seller") {
        c.sellerName = h.name;
        if ((c.listingTitle || "") === "General enquiry") c.listingTitle = `Shop enquiry: ${h.name}`;
      }
    }
  }
  return NextResponse.json({ items });
}
