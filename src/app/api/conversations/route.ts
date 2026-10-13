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
});

/** Start a conversation about a listing (signed-in or guest with phone). */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "convo:new"), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many new chats. Wait a bit." }, { status: 429 });
  const parsed = startSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Write a message (max 2000 chars)." }, { status: 400 });
  const d = parsed.data;

  const user = await currentUser().catch(() => null);
  const name = user?.name ?? d.name;
  const phone = user?.phone ?? d.phone;
  if (!name || !phone) {
    return NextResponse.json({ error: "Guests need a name + Kenyan phone to chat." }, { status: 400 });
  }

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

  const viewerId = user?.id ?? `phone:${phone}`;
  // Link the seller side via exact display-name match (name + businessName).
  let sellerId: string | undefined;
  try {
    const hit = await store.findUserByDisplayName(seller).catch(() => null);
    sellerId = hit?.id;
  } catch {}
  // Blocked participants can't open new threads with each other on the same listing.
  try {
    const blocked = ((await store.getSetting(`blocked:${viewerId}`).catch(() => null)) as string[] | null) ?? [];
    if (sellerId && blocked.includes(sellerId)) {
      return NextResponse.json({ error: "You blocked this seller." }, { status: 403 });
    }
  } catch {}
  const convo = await store.createConversation({
    listingId: d.listingId,
    listingTitle: title,
    sellerName: seller,
    sellerId,
    buyerId: viewerId,
    buyerName: name,
    buyerPhone: phone,
    firstMessage: { senderId: viewerId, senderLabel: name, body: plain, bodyHtml: toSafeHtml(plain) },
  });
  notifyLater({ channel: "sms", to: phone, message: `Chap: chat opened with ${seller} — "${toExcerpt(plain, 80)}"` });
  return NextResponse.json({ ok: true, id: convo.id });
}

/** My inbox — signed-in buyers/sellers, or guests via exact ?phone=. */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("phone") ?? "";
  const user = await currentUser().catch(() => null);
  const identity = user
    ? { userId: user.id, phone: user.phone, sellerName: user.name }
    : /^(\+254|0)[17]\d{8}$/.test(q)
      ? { phone: q }
      : undefined;
  if (!identity) return NextResponse.json({ error: "Sign in or provide your phone." }, { status: 401 });
  const store = getStore();
  const items = await store.listConversations(identity);
  // Signed-in with a different ?phone= (chat started as guest with another
  // number): merge that phone's inbox so history never vanishes.
  if (user && /^(\+254|0)[17]\d{8}$/.test(q) && q !== user.phone) {
    const extra = await store.listConversations({ phone: q }).catch(() => []);
    const seen = new Set(items.map((c) => c.id));
    for (const c of extra) if (!seen.has(c.id)) items.push(c);
    items.sort((a, b) => +new Date(b.lastAt ?? b.createdAt) - +new Date(a.lastAt ?? a.createdAt));
  }
  return NextResponse.json({ items });
}
