/** Chat access control (shared by conversation routes, unit-tested).
 *
 * The classic lockout: a guest starts a chat with phone X, then signs in with
 * an account whose phone is Y. The old check only compared the account phone,
 * so the sender's own chat 403'd ("This chat isn't yours") and history
 * vanished. These helpers keep a `?phone=`/body-phone fallback for signed-in
 * viewers and let sign-in claim guest chats (see claimGuestConversations).
 */
import type { Store } from "./store";

export type ChatIdentity = { userId?: string; phone?: string; altPhone?: string };
export type ChatParty = { buyerId?: string; sellerId?: string; buyerPhone?: string; sellerName?: string };
export type ChatUser = { id: string; name: string; role: string; phone?: string } | null;

const KENYAN_PHONE = /^(\+254|0)[17]\d{8}$/;

export function validPhone(p: string): boolean {
  return KENYAN_PHONE.test(p);
}

export function identityOf(user: { id: string; phone: string } | null, phone: string): ChatIdentity | null {
  const q = validPhone(phone.trim()) ? phone.trim() : undefined;
  if (user) {
    return { userId: user.id, phone: user.phone, ...(q && q !== user.phone ? { altPhone: q } : {}) };
  }
  return q ? { phone: q } : null;
}

/** Resolve the viewer's sender id, or null when not a participant. */
export function isParticipant(c: ChatParty, id: ChatIdentity, user?: ChatUser): string | null {
  if (id.userId && (c.buyerId === id.userId || c.sellerId === id.userId)) return id.userId;
  const phones = [id.phone, id.altPhone].filter(Boolean) as string[];
  for (const p of phones) {
    if (c.buyerPhone === p || c.buyerId === `phone:${p}`) return id.userId ?? `phone:${p}`;
  }
  // Signed-in seller whose display name matches the listing's seller, plus admins.
  if (user && (user.name === c.sellerName || user.role === "ADMIN")) return user.id;
  return null;
}

/** Is this message mine? Covers pre-claim guest messages (`phone:X`) read as the account. */
export function mineOf(senderId: string, viewer: string, accountPhone?: string): boolean {
  if (senderId === viewer) return true;
  if (accountPhone && senderId === `phone:${accountPhone}`) return true;
  return false;
}

/**
 * Seller-side fallback for backends that don't persist sellerName on the
 * thread (Prisma): the listing owner, its shop staff, or an admin counts as
 * the seller. Display-name match is kept for catalogue listings.
 */
export async function isChatSeller(
  store: Store,
  convo: { listingId?: string; sellerName?: string },
  user: ChatUser
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.name && convo.sellerName && user.name === convo.sellerName) return true;
  if (!convo.listingId) return false;
  const s = await store.getListing(convo.listingId).catch(() => null);
  if (s) {
    if (s.ownerId === user.id) return true;
    if (s.shopSlug) {
      const members = await store.listShopMembers(s.shopSlug).catch(() => []);
      if (members.some((m) => m.userId === user.id)) return true;
    }
    return false;
  }
  const { getListing } = await import("@/data/catalog");
  const c = getListing(convo.listingId);
  if (!c) return false;
  if (user.name === c.sellerName) return true;
  const hit = await store.findUserByDisplayName(c.sellerName).catch(() => null);
  return !!hit && hit.id === user.id;
}

/**
 * Heal legacy threads stored with a generic seller ("Seller") before shop-chat
 * naming existed: resolve the real seller or shop name + contact from the
 * listing/shop. Returns the stored name untouched when it already looks real.
 */
export async function resolveThreadSeller(
  store: Store,
  convo: { listingId?: string; sellerName?: string }
): Promise<{ name: string; phone?: string }> {
  const stored = (convo.sellerName || "").trim();
  const needsHeal = !stored || stored.toLowerCase() === "seller";
  const lid = (convo.listingId || "").trim();
  if (!needsHeal || !lid || lid === "general") {
    return { name: stored || "Seller" };
  }
  if (lid.startsWith("shop:")) {
    const slug = lid.slice(5);
    const s = await store.getShopBySlug(slug).catch(() => null);
    if (s) return { name: s.name, phone: s.phone };
    const { getShop } = await import("@/data/catalog");
    const d = getShop(slug);
    if (d) return { name: d.name, phone: d.phone };
    return { name: stored || "Seller" };
  }
  const s = await store.getListing(lid).catch(() => null);
  if (s) {
    if (s.shopSlug) {
      const shop = await store.getShopBySlug(s.shopSlug).catch(() => null);
      if (shop) return { name: shop.name, phone: shop.phone };
    }
    return { name: s.sellerName || stored || "Seller", phone: s.sellerPhone || undefined };
  }
  const { getListing } = await import("@/data/catalog");
  const c = getListing(lid);
  if (!c) return { name: stored || "Seller" };
  if (c.shopSlug) {
    const { getShop } = await import("@/data/catalog");
    const d = getShop(c.shopSlug);
    if (d) return { name: d.name, phone: d.phone };
  }
  return { name: c.sellerName, phone: c.sellerPhone };
}
