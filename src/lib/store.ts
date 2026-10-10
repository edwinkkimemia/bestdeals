/**
 * Persistence layer: one typed interface, two backends.
 * - DemoStore (in-memory): used when DATABASE_URL is unset — zero-config dev.
 * - PrismaStore (PostgreSQL): used automatically once DATABASE_URL is set and
 *   `prisma migrate deploy` has run. Swap is transparent to API routes.
 */
import { db } from "./db";
import type { PrismaClient } from "@prisma/client";
import { uid, slugify } from "./utils";

export type Role = "BUYER" | "SELLER" | "MERCHANT" | "ADMIN";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  verified: boolean;
  emailVerified: boolean;
  passwordHash: string;
  createdAt: string;
};

export type ListingRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "product" | "classified" | "service";
  status: string;
  price: number;
  compareAt?: number | null;
  condition: string;
  txMethod: string;
  negotiable: boolean;
  stock: number;
  county: string;
  town: string;
  images: string[];
  attributes: Record<string, string>;
  ownerId?: string;
  sellerName: string;
  sellerPhone?: string;
  shopSlug?: string;
  categorySlug?: string;
  featured?: boolean;
  createdAt: string;
};

export type OrderLine = { id?: string; title: string; qty: number; price: number };
export type SuborderInput = {
  seller: string;
  items: OrderLine[];
  subtotal: number;
  commission: number;
};

export type OrderRecord = {
  id: string;
  buyerId?: string;
  name: string;
  phone: string;
  email?: string;
  county: string;
  town: string;
  address: string;
  deliveryMethod: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  status: string;
  paymentStatus: string;
  items: OrderLine[];
  suborders: SuborderInput[];
  createdAt: string;
};

export type EnquiryRecord = {
  id: string;
  listingId: string;
  name: string;
  phone: string;
  message: string;
  createdAt: string;
};

export type ReportRecord = {
  id: string;
  listingId?: string;
  reason: string;
  status: string;
  createdAt: string;
};

export type ShopRecord = {
  slug: string;
  name: string;
  description: string;
  businessCategory: string;
  county: string;
  town: string;
  phone: string;
  ownerId?: string;
  verified: boolean;
  createdAt: string;
};

export type VerificationRecord = {
  id: string;
  userId: string;
  kind: string;
  phone?: string;
  status: string;
  docPath?: string;
  fileName?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
};

export type ReviewRecord = {
  id: string;
  orderId?: string;
  listingId?: string;
  shopSlug?: string;
  sellerName?: string;
  authorName: string;
  rating: number;
  body?: string;
  verifiedPurchase: boolean;
  status: string;
  createdAt: string;
};

export type DisputeRecord = {
  id: string;
  orderId: string;
  buyerName?: string;
  phone?: string;
  reason: string;
  details?: string;
  status: string;
  response?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
};

export type PromotionRecord = {
  id: string;
  listingId: string;
  ownerId?: string;
  kind: string; // featured | sponsored
  days: number;
  amount: number;
  status: string; // pending_payment | active | expired | cancelled
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type ConversationRecord = {
  id: string;
  listingId?: string;
  listingTitle?: string;
  sellerName?: string;
  sellerId?: string;
  buyerId?: string;
  buyerName?: string;
  buyerPhone?: string;
  createdAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  senderLabel: string;
  body: string; // markdown source
  bodyHtml?: string; // sanitized render (computed at write)
  read: boolean;
  createdAt: string;
};

export type ConversationWithMeta = ConversationRecord & {
  lastMessage?: string;
  lastAt?: string;
  unread: number;
};

export interface Store {
  // users
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(u: Omit<UserRecord, "id" | "createdAt" | "emailVerified"> & { emailVerified?: boolean }): Promise<UserRecord>;
  setUserVerified(id: string, verified: boolean): Promise<void>;
  setEmailVerified(id: string, verified: boolean): Promise<void>;
  setUserPassword(id: string, passwordHash: string): Promise<void>;
  updateUser(id: string, patch: { name?: string; phone?: string }): Promise<UserRecord | null>;
  deleteUserAccount(id: string): Promise<void>;
  exportUserData(id: string): Promise<Record<string, unknown>>;
  listUsers(): Promise<UserRecord[]>;
  // listings
  createListing(l: Omit<ListingRecord, "id" | "slug" | "status" | "createdAt">): Promise<ListingRecord>;
  getListing(id: string): Promise<ListingRecord | null>;
  listListingsByOwner(ownerId: string): Promise<ListingRecord[]>;
  listListingsByStatus(status: string): Promise<ListingRecord[]>;
  setListingStatus(id: string, status: string, adminId?: string, reason?: string): Promise<void>;
  setListingFeatured(id: string, featured: boolean): Promise<void>;
  updateListing(id: string, patch: Partial<Pick<ListingRecord, "title" | "description" | "type" | "price" | "compareAt" | "condition" | "txMethod" | "negotiable" | "stock" | "county" | "town" | "images" | "attributes" | "categorySlug" | "shopSlug">>): Promise<ListingRecord | null>;
  deleteListing(id: string): Promise<void>;
  // orders + payments
  createOrder(o: Omit<OrderRecord, "id" | "createdAt" | "status" | "paymentStatus"> & { id?: string; status?: string; paymentStatus?: string }): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  listOrdersByPhone(phone: string): Promise<OrderRecord[]>;
  listOrdersByBuyer(buyerId: string): Promise<OrderRecord[]>;
  listOrders(): Promise<OrderRecord[]>;
  setOrderPayment(id: string, paymentStatus: string, providerRef?: string): Promise<void>;
  setOrderStatus(id: string, status: string): Promise<void>;
  recordPayment(p: { orderId: string; method: string; amount: number; status: string; providerRef?: string }): Promise<{ id: string; duplicate: boolean }>;
  // enquiries / reports
  createEnquiry(e: Omit<EnquiryRecord, "id" | "createdAt">): Promise<EnquiryRecord>;
  createReport(r: Omit<ReportRecord, "id" | "createdAt" | "status">): Promise<ReportRecord>;
  listReports(status?: string): Promise<ReportRecord[]>;
  setReportStatus(id: string, status: string): Promise<void>;
  // shops
  createShop(s: Omit<ShopRecord, "createdAt" | "verified">): Promise<ShopRecord>;
  getShopBySlug(slug: string): Promise<ShopRecord | null>;
  listShops(): Promise<ShopRecord[]>;
  setShopVerified(slug: string, verified: boolean): Promise<void>;
  // verification
  createVerification(v: Omit<VerificationRecord, "id" | "status" | "createdAt">): Promise<VerificationRecord>;
  listVerifications(status?: string): Promise<VerificationRecord[]>;
  decideVerification(id: string, approve: boolean, adminId: string): Promise<void>;
  // reviews
  createReview(r: Omit<ReviewRecord, "id" | "status" | "createdAt">): Promise<ReviewRecord>;
  listApprovedReviewsForSeller(sellerName: string): Promise<ReviewRecord[]>;
  listApprovedReviewsForShop(shopSlug: string): Promise<ReviewRecord[]>;
  listPendingReviews(): Promise<ReviewRecord[]>;
  setReviewStatus(id: string, status: string): Promise<void>;
  // disputes
  createDispute(d: Omit<DisputeRecord, "id" | "status" | "createdAt">): Promise<DisputeRecord>;
  getDisputeByOrder(orderId: string): Promise<DisputeRecord | null>;
  listDisputes(status?: string): Promise<DisputeRecord[]>;
  respondDispute(id: string, response: string): Promise<void>;
  resolveDispute(id: string, outcome: "refund" | "reject", adminId: string): Promise<void>;
  // promotions (paid featured visibility)
  createPromotion(p: { listingId: string; ownerId?: string; kind: string; days: number; amount: number }): Promise<PromotionRecord>;
  getPromotion(id: string): Promise<PromotionRecord | null>;
  listPromotions(status?: string): Promise<PromotionRecord[]>;
  listPromotionsForOwner(ownerId: string): Promise<PromotionRecord[]>;
  listPromotionsByListing(listingId: string): Promise<PromotionRecord[]>;
  setPromotionStatus(id: string, status: string): Promise<void>;
  // conversations (in-app messaging)
  createConversation(c: Omit<ConversationRecord, "id" | "createdAt"> & { firstMessage: { senderId: string; senderLabel: string; body: string; bodyHtml: string } }): Promise<ConversationRecord>;
  getConversation(id: string): Promise<ConversationRecord | null>;
  listConversations(identity: { userId?: string; phone?: string; sellerName?: string }): Promise<ConversationWithMeta[]>;
  listMessages(conversationId: string): Promise<MessageRecord[]>;
  addMessage(m: Omit<MessageRecord, "id" | "read" | "createdAt">): Promise<MessageRecord>;
  markConversationRead(conversationId: string, viewerId: string): Promise<void>;
}

const now = () => new Date().toISOString();

/* ------------------------------- demo store ------------------------------ */

class DemoStore implements Store {
  users = new Map<string, UserRecord>();
  listings = new Map<string, ListingRecord>();
  orders = new Map<string, OrderRecord>();
  payments = new Map<string, { id: string; orderId: string; providerRef?: string }>();
  enquiries: EnquiryRecord[] = [];
  reports = new Map<string, ReportRecord>();
  shops = new Map<string, ShopRecord>();
  verifications = new Map<string, VerificationRecord>();
  reviews = new Map<string, ReviewRecord>();
  disputes = new Map<string, DisputeRecord>();
  conversations = new Map<string, ConversationRecord>();
  messages = new Map<string, MessageRecord[]>();
  promotions = new Map<string, PromotionRecord>();

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }
  async createUser(u: Omit<UserRecord, "id" | "createdAt" | "emailVerified"> & { emailVerified?: boolean }) {
    const rec: UserRecord = { ...u, emailVerified: u.emailVerified ?? false, id: uid("u"), createdAt: now() };
    this.users.set(rec.id, rec);
    return rec;
  }
  async setUserVerified(id: string, verified: boolean) {
    const u = this.users.get(id);
    if (u) u.verified = verified;
  }
  async setEmailVerified(id: string, verified: boolean) {
    const u = this.users.get(id);
    if (u) u.emailVerified = verified;
  }
  async setUserPassword(id: string, passwordHash: string) {
    const u = this.users.get(id);
    if (u) u.passwordHash = passwordHash;
  }
  async updateUser(id: string, patch: { name?: string; phone?: string }) {
    const u = this.users.get(id);
    if (!u) return null;
    if (patch.name && patch.name.trim().length >= 2) u.name = patch.name.trim().slice(0, 80);
    if (patch.phone && /^(\+254|0)[17]\d{8}$/.test(patch.phone)) u.phone = patch.phone;
    return u;
  }
  async deleteUserAccount(id: string) {
    const u = this.users.get(id);
    if (!u) return;
    // Remove profile + seller footprint; transactional records keep anonymised snapshots.
    for (const [lid, l] of this.listings) if (l.ownerId === id) this.listings.delete(lid);
    for (const [slug, s] of this.shops) if (s.ownerId === id) this.shops.delete(slug);
    for (const [vid, v] of this.verifications) if (v.userId === id) this.verifications.delete(vid);
    for (const o of this.orders.values()) {
      if (o.buyerId === id) {
        o.buyerId = undefined;
        o.name = "Deleted user";
        o.email = undefined;
        o.phone = "0700000000";
      }
    }
    this.users.delete(id);
  }
  async exportUserData(id: string) {
    const u = this.users.get(id);
    if (!u) return {};
    const { passwordHash: _ph, ...safe } = u;
    return {
      exportedAt: now(),
      user: safe,
      listings: [...this.listings.values()].filter((l) => l.ownerId === id),
      orders: [...this.orders.values()].filter((o) => o.buyerId === id || o.phone === u.phone),
      shops: [...this.shops.values()].filter((s) => s.ownerId === id),
      verifications: [...this.verifications.values()].filter((v) => v.userId === id).map((v) => ({ ...v, docPath: "[redacted]" })),
      disputes: [...this.disputes.values()].filter((d) => d.phone === u.phone),
    };
  }
  async listUsers() {
    return [...this.users.values()];
  }

  async createListing(l: Omit<ListingRecord, "id" | "slug" | "status" | "createdAt">) {
    const id = uid("listing");
    const rec: ListingRecord = {
      ...l,
      id,
      slug: `${slugify(l.title)}-${id.slice(-6)}`,
      status: "pending",
      createdAt: now(),
    };
    this.listings.set(id, rec);
    return rec;
  }
  async getListing(id: string) {
    return this.listings.get(id) ?? null;
  }
  async listListingsByOwner(ownerId: string) {
    return [...this.listings.values()]
      .filter((l) => l.ownerId === ownerId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  async listListingsByStatus(status: string) {
    return [...this.listings.values()].filter((l) => l.status === status);
  }
  async setListingStatus(id: string, status: string) {
    const l = this.listings.get(id);
    if (l) l.status = status;
  }
  async setListingFeatured(id: string, featured: boolean) {
    const l = this.listings.get(id);
    if (l) l.featured = featured;
  }
  async updateListing(id: string, patch: Partial<ListingRecord>) {
    const l = this.listings.get(id);
    if (!l) return null;
    const next: ListingRecord = { ...l };
    for (const k of ["title", "description", "type", "price", "compareAt", "condition", "txMethod", "negotiable", "stock", "county", "town", "images", "attributes", "categorySlug", "shopSlug"] as const) {
      if (patch[k] !== undefined) (next as Record<string, unknown>)[k] = patch[k];
    }
    this.listings.set(id, next);
    return next;
  }
  async deleteListing(id: string) {
    this.listings.delete(id);
  }

  async createOrder(o: Omit<OrderRecord, "id" | "createdAt" | "status" | "paymentStatus"> & { id?: string; status?: string; paymentStatus?: string }) {
    const rec: OrderRecord = {
      ...o,
      id: o.id ?? uid("BD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14),
      status: o.status ?? "pending",
      paymentStatus: o.paymentStatus ?? "pending",
      createdAt: now(),
    };
    // Note: caller passes the final id/total; keep server-computed values as given.
    this.orders.set(rec.id, rec as OrderRecord);
    return rec as OrderRecord;
  }
  async getOrder(id: string) {
    return this.orders.get(id) ?? null;
  }
  async listOrdersByPhone(phone: string) {
    return [...this.orders.values()].filter((o) => o.phone === phone);
  }
  async listOrdersByBuyer(buyerId: string) {
    return [...this.orders.values()].filter((o) => o.buyerId === buyerId);
  }
  async listOrders() {
    return [...this.orders.values()];
  }
  async setOrderPayment(id: string, paymentStatus: string) {
    const o = this.orders.get(id);
    if (o) o.paymentStatus = paymentStatus;
  }
  async setOrderStatus(id: string, status: string) {
    const o = this.orders.get(id);
    if (o) o.status = status;
  }
  async recordPayment(p: { orderId: string; method: string; amount: number; status: string; providerRef?: string }) {
    if (p.providerRef) {
      const dup = [...this.payments.values()].find((x) => x.providerRef === p.providerRef);
      if (dup) return { id: dup.id, duplicate: true };
    }
    const id = uid("pay");
    this.payments.set(id, { id, orderId: p.orderId, providerRef: p.providerRef });
    return { id, duplicate: false };
  }

  async createEnquiry(e: Omit<EnquiryRecord, "id" | "createdAt">) {
    const rec = { ...e, id: uid("msg"), createdAt: now() };
    this.enquiries.unshift(rec);
    return rec;
  }
  async createReport(r: Omit<ReportRecord, "id" | "createdAt" | "status">) {
    const rec: ReportRecord = { ...r, id: uid("rep"), status: "open", createdAt: now() };
    this.reports.set(rec.id, rec);
    return rec;
  }
  async listReports(status?: string) {
    const all = [...this.reports.values()];
    return status ? all.filter((r) => r.status === status) : all;
  }
  async setReportStatus(id: string, status: string) {
    const r = this.reports.get(id);
    if (r) r.status = status;
  }

  async createShop(s: Omit<ShopRecord, "createdAt" | "verified">) {
    const rec: ShopRecord = { ...s, verified: false, createdAt: now() };
    this.shops.set(rec.slug, rec);
    return rec;
  }
  async getShopBySlug(slug: string) {
    return this.shops.get(slug) ?? null;
  }
  async listShops() {
    return [...this.shops.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  async setShopVerified(slug: string, verified: boolean) {
    const s = this.shops.get(slug);
    if (s) s.verified = verified;
  }

  async createVerification(v: Omit<VerificationRecord, "id" | "status" | "createdAt">) {
    const rec: VerificationRecord = { ...v, id: uid("ver"), status: "pending", createdAt: now() };
    this.verifications.set(rec.id, rec);
    return rec;
  }
  async listVerifications(status?: string) {
    const all = [...this.verifications.values()];
    return status ? all.filter((v) => v.status === status) : all;
  }
  async decideVerification(id: string, approve: boolean) {
    const v = this.verifications.get(id);
    if (v) v.status = approve ? "approved" : "rejected";
  }

  async createReview(r: Omit<ReviewRecord, "id" | "status" | "createdAt">) {
    const rec: ReviewRecord = { ...r, id: uid("rev"), status: "pending", createdAt: now() };
    this.reviews.set(rec.id, rec);
    return rec;
  }
  async listApprovedReviewsForSeller(sellerName: string) {
    return [...this.reviews.values()].filter((r) => r.sellerName === sellerName && r.status === "approved");
  }
  async listApprovedReviewsForShop(shopSlug: string) {
    return [...this.reviews.values()].filter((r) => r.shopSlug === shopSlug && r.status === "approved");
  }
  async listPendingReviews() {
    return [...this.reviews.values()].filter((r) => r.status === "pending");
  }
  async setReviewStatus(id: string, status: string) {
    const r = this.reviews.get(id);
    if (r) r.status = status;
  }

  async createDispute(d: Omit<DisputeRecord, "id" | "status" | "createdAt">) {
    const rec: DisputeRecord = { ...d, id: uid("dsp"), status: "open", createdAt: now() };
    this.disputes.set(rec.id, rec);
    return rec;
  }
  async getDisputeByOrder(orderId: string) {
    return [...this.disputes.values()].find((d) => d.orderId === orderId) ?? null;
  }
  async listDisputes(status?: string) {
    const all = [...this.disputes.values()];
    return status ? all.filter((d) => d.status === status) : all;
  }
  async respondDispute(id: string, response: string) {
    const d = this.disputes.get(id);
    if (d) {
      d.response = response;
      d.status = "seller_responded";
    }
  }
  async resolveDispute(id: string, outcome: "refund" | "reject") {
    const d = this.disputes.get(id);
    if (d) d.status = outcome === "refund" ? "resolved_refund" : "resolved_reject";
  }

  async createPromotion(p: { listingId: string; ownerId?: string; kind: string; days: number; amount: number }) {
    const startsAt = new Date().toISOString();
    const rec: PromotionRecord = {
      ...p,
      id: uid("promo"),
      status: "pending_payment",
      startsAt,
      endsAt: new Date(Date.now() + p.days * 86400_000).toISOString(),
      createdAt: startsAt,
    };
    this.promotions.set(rec.id, rec);
    return rec;
  }
  async listPromotionsForOwner(ownerId: string) {
    return [...this.promotions.values()]
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  async getPromotion(id: string) {
    return this.promotions.get(id) ?? null;
  }
  async listPromotions(status?: string) {
    const all = [...this.promotions.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return status ? all.filter((p) => p.status === status) : all;
  }
  async listPromotionsByListing(listingId: string) {
    return [...this.promotions.values()]
      .filter((p) => p.listingId === listingId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  async setPromotionStatus(id: string, status: string) {
    const p = this.promotions.get(id);
    if (p) p.status = status;
  }

  async createConversation(c: Omit<ConversationRecord, "id" | "createdAt"> & { firstMessage: { senderId: string; senderLabel: string; body: string; bodyHtml: string } }) {
    const rec: ConversationRecord = {
      id: uid("convo"), listingId: c.listingId, listingTitle: c.listingTitle,
      sellerName: c.sellerName, sellerId: c.sellerId, buyerId: c.buyerId,
      buyerName: c.buyerName, buyerPhone: c.buyerPhone, createdAt: now(),
    };
    this.conversations.set(rec.id, rec);
    this.messages.set(rec.id, []);
    await this.addMessage({
      conversationId: rec.id, senderId: c.firstMessage.senderId,
      senderLabel: c.firstMessage.senderLabel, body: c.firstMessage.body, bodyHtml: c.firstMessage.bodyHtml,
    });
    return rec;
  }
  async getConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }
  private convoMatches(c: ConversationRecord, identity: { userId?: string; phone?: string; sellerName?: string }): boolean {
    if (identity.userId && (c.buyerId === identity.userId || c.sellerId === identity.userId)) return true;
    if (identity.phone && (c.buyerPhone === identity.phone || c.buyerId === `phone:${identity.phone}`)) return true;
    if (identity.sellerName && c.sellerName === identity.sellerName) return true;
    return false;
  }
  private viewerId(identity: { userId?: string; phone?: string }): string {
    return identity.userId ?? (identity.phone ? `phone:${identity.phone}` : "");
  }
  async listConversations(identity: { userId?: string; phone?: string; sellerName?: string }) {
    const viewer = this.viewerId(identity);
    const out: ConversationWithMeta[] = [];
    for (const c of this.conversations.values()) {
      if (!this.convoMatches(c, identity)) continue;
      const msgs = this.messages.get(c.id) ?? [];
      const last = msgs[msgs.length - 1];
      out.push({
        ...c,
        lastMessage: last?.body.slice(0, 120),
        lastAt: last?.createdAt ?? c.createdAt,
        unread: msgs.filter((m) => m.senderId !== viewer && !m.read).length,
      });
    }
    return out.sort((a, b) => +new Date(b.lastAt ?? 0) - +new Date(a.lastAt ?? 0));
  }
  async listMessages(conversationId: string) {
    return [...(this.messages.get(conversationId) ?? [])];
  }
  async addMessage(m: Omit<MessageRecord, "id" | "read" | "createdAt">) {
    const rec: MessageRecord = { ...m, id: uid("msg"), read: false, createdAt: now() };
    const arr = this.messages.get(m.conversationId) ?? [];
    arr.push(rec);
    this.messages.set(m.conversationId, arr);
    return rec;
  }
  async markConversationRead(conversationId: string, viewerId: string) {
    for (const m of this.messages.get(conversationId) ?? []) {
      if (m.senderId !== viewerId) m.read = true;
    }
  }
}

/* ------------------------------ prisma store ----------------------------- */

const mapUser = (u: {
  id: string; name: string; email: string; phone: string; role: string;
  verified: boolean; passwordHash: string; createdAt: Date; emailVerified?: boolean;
}): UserRecord => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone,
  role: u.role as Role, verified: u.verified, emailVerified: u.emailVerified ?? false,
  passwordHash: u.passwordHash,
  createdAt: u.createdAt.toISOString(),
});

class PrismaStore implements Store {
  constructor(private prisma: PrismaClient) {}
  private get p(): PrismaClient {
    return this.prisma;
  }

  async findUserByEmail(email: string) {
    const u = await this.p.user.findUnique({ where: { email: email.toLowerCase() } });
    return u ? mapUser(u) : null;
  }
  async findUserById(id: string) {
    const u = await this.p.user.findUnique({ where: { id } });
    return u ? mapUser(u) : null;
  }
  async createUser(u: Omit<UserRecord, "id" | "createdAt" | "emailVerified"> & { emailVerified?: boolean }) {
    const rec = await this.p.user.create({
      data: {
        name: u.name, email: u.email.toLowerCase(), phone: u.phone,
        passwordHash: u.passwordHash, role: u.role as never, verified: u.verified,
        seller: { create: { displayName: u.name } },
      },
    });
    return mapUser(rec);
  }
  async setUserVerified(id: string, verified: boolean) {
    await this.p.user.update({ where: { id }, data: { verified } });
  }
  async setEmailVerified(id: string, verified: boolean) {
    await this.p.user.update({ where: { id }, data: { emailVerified: verified } });
  }
  async setUserPassword(id: string, passwordHash: string) {
    await this.p.user.update({ where: { id }, data: { passwordHash } });
  }
  async updateUser(id: string, patch: { name?: string; phone?: string }) {
    const data: { name?: string; phone?: string } = {};
    if (patch.name && patch.name.trim().length >= 2) data.name = patch.name.trim().slice(0, 80);
    if (patch.phone && /^(\+254|0)[17]\d{8}$/.test(patch.phone)) data.phone = patch.phone;
    if (Object.keys(data).length === 0) return this.findUserById(id);
    const u = await this.p.user.update({ where: { id }, data });
    return mapUser(u);
  }
  async deleteUserAccount(id: string) {
    const u = await this.p.user.findUnique({ where: { id } });
    if (!u) return;
    const profile = await this.p.sellerProfile.findUnique({ where: { userId: id } });
    await this.p.$transaction([
      this.p.listing.deleteMany({ where: { sellerProfileId: profile?.id ?? "__none__" } }),
      this.p.shopMember.deleteMany({ where: { userId: id } }),
      this.p.verification.deleteMany({ where: { userId: id } }),
      this.p.review.updateMany({ where: { authorId: id }, data: { authorId: null, authorName: "Deleted user" } }),
      this.p.order.updateMany({ where: { buyerId: id }, data: { buyerId: null, name: "Deleted user", email: null, phone: "0700000000" } }),
      this.p.consent.deleteMany({ where: { userId: id } }),
      this.p.auditLog.deleteMany({ where: { actorId: id } }),
      this.p.sellerProfile.deleteMany({ where: { userId: id } }),
      this.p.user.delete({ where: { id } }),
    ]);
  }
  async exportUserData(id: string) {
    const u = await this.p.user.findUnique({ where: { id } });
    if (!u) return {};
    const [listings, orders, reviews, verifications, disputes] = await Promise.all([
      this.p.listing.findMany({ where: { sellerName: u.name } }),
      this.p.order.findMany({ where: { OR: [{ buyerId: id }, { phone: u.phone }] } }),
      this.p.review.findMany({ where: { authorId: id } }),
      this.p.verification.findMany({ where: { userId: id } }),
      this.p.dispute.findMany({ where: { phone: u.phone } }),
    ]);
    return {
      exportedAt: now(),
      user: { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, verified: u.verified, emailVerified: u.emailVerified ?? false, createdAt: u.createdAt },
      listings: listings.map((l: { id: string; title: string; status: unknown }) => ({ id: l.id, title: l.title, status: String(l.status) })),
      orders: orders.map((o: { id: string; total: number; status: unknown }) => ({ id: o.id, total: o.total, status: String(o.status) })),
      reviews: reviews.length,
      verifications: verifications.map((v: { kind: string; status: string }) => ({ kind: v.kind, status: v.status })),
      disputes: disputes.length,
    };
  }
  async listUsers() {
    return (await this.p.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 })).map(mapUser);
  }

  async createListing(l: Omit<ListingRecord, "id" | "slug" | "status" | "createdAt">) {
    const id = uid("listing");
    let sellerProfileId: string | undefined;
    if (l.ownerId) {
      const profile = await this.p.sellerProfile.findUnique({ where: { userId: l.ownerId } });
      if (profile) sellerProfileId = profile.id;
    }
    const rec = await this.p.listing.create({
      data: {
        id,
        slug: `${slugify(l.title)}-${id.slice(-6)}`,
        title: l.title,
        description: l.description,
        type: l.type as never,
        status: "pending" as never,
        price: l.price,
        compareAt: l.compareAt ?? null,
        condition: l.condition as never,
        txMethod: l.txMethod as never,
        negotiable: l.negotiable,
        stock: l.stock,
        county: l.county,
        town: l.town,
        sellerName: l.sellerName,
        sellerPhone: l.sellerPhone ?? null,
        sellerProfileId: sellerProfileId ?? null,
        subcategory: l.categorySlug ?? undefined,
        attributes: l.attributes ?? {},
        images: l.images?.length
          ? { create: l.images.map((url, i) => ({ url, position: i })) }
          : undefined,
      },
    });
    return {
      id: rec.id, slug: rec.slug, title: rec.title, description: rec.description,
      type: l.type, status: "pending", price: rec.price, compareAt: rec.compareAt,
      condition: l.condition, txMethod: l.txMethod, negotiable: rec.negotiable,
      stock: rec.stock, county: rec.county, town: rec.town, images: l.images ?? [],
      attributes: l.attributes ?? {}, ownerId: l.ownerId, sellerName: l.sellerName,
      shopSlug: l.shopSlug, categorySlug: l.categorySlug, featured: false, createdAt: rec.createdAt.toISOString(),
    };
  }
  async getListing(id: string) {
    const rec = await this.p.listing.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, seller: true } });
    if (!rec) return null;
    return {
      id: rec.id, slug: rec.slug, title: rec.title, description: rec.description,
      type: rec.type as ListingRecord["type"], status: rec.status as string,
      price: rec.price, compareAt: rec.compareAt, condition: rec.condition as string,
      txMethod: rec.txMethod as string, negotiable: rec.negotiable, stock: rec.stock,
      county: rec.county, town: rec.town,
      images: rec.images.map((i: { url: string }) => i.url),
      attributes: (rec.attributes as Record<string, string>) ?? {},
      ownerId: (rec.seller as { userId?: string } | null)?.userId ?? rec.sellerProfileId ?? undefined,
      sellerName: rec.sellerName ?? "Seller",
      sellerPhone: rec.sellerPhone ?? undefined,
      shopSlug: undefined, categorySlug: (rec as { subcategory?: string | null }).subcategory ?? undefined, featured: (rec as { featured?: boolean }).featured ?? false, createdAt: rec.createdAt.toISOString(),
    };
  }
  async listListingsByOwner(ownerId: string) {
    // ownerId is the User id — resolve to the seller profile first.
    const profile = await this.p.sellerProfile.findUnique({ where: { userId: ownerId } }).catch(() => null);
    if (!profile) return [];
    const recs = await this.p.listing.findMany({
      where: { sellerProfileId: profile.id },
      orderBy: { createdAt: "desc" }, take: 200,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    });
    return recs.map((rec: (typeof recs)[number]) => ({
      id: rec.id, slug: rec.slug, title: rec.title, description: rec.description,
      type: rec.type as ListingRecord["type"], status: rec.status as string,
      price: rec.price, compareAt: rec.compareAt, condition: rec.condition as string,
      txMethod: rec.txMethod as string, negotiable: rec.negotiable, stock: rec.stock,
      county: rec.county, town: rec.town,
      images: rec.images.map((i: { url: string }) => i.url),
      attributes: (rec as { attributes?: Record<string, string> }).attributes ?? {}, ownerId,
      sellerName: rec.sellerName ?? "Seller",
      sellerPhone: rec.sellerPhone ?? undefined,
      shopSlug: undefined, categorySlug: (rec as { subcategory?: string | null }).subcategory ?? undefined, featured: (rec as { featured?: boolean }).featured ?? false, createdAt: rec.createdAt.toISOString(),
    }));
  }
  async listListingsByStatus(status: string) {
    const recs = await this.p.listing.findMany({
      where: { status: status as never },
      orderBy: { createdAt: "desc" }, take: 200,
      include: { images: { orderBy: { position: "asc" }, take: 1 }, seller: true },
    });
    return recs.map((rec: (typeof recs)[number]) => ({
      id: rec.id, slug: rec.slug, title: rec.title, description: rec.description,
      type: rec.type as ListingRecord["type"], status: rec.status as string,
      price: rec.price, compareAt: rec.compareAt, condition: rec.condition as string,
      txMethod: rec.txMethod as string, negotiable: rec.negotiable, stock: rec.stock,
      county: rec.county, town: rec.town,
      images: rec.images.map((i: { url: string }) => i.url),
      attributes: (rec as { attributes?: Record<string, string> }).attributes ?? {},
      ownerId: ((rec as { seller?: { userId?: string } | null }).seller)?.userId ?? rec.sellerProfileId ?? undefined,
      sellerName: rec.sellerName ?? "Seller",
      sellerPhone: rec.sellerPhone ?? undefined,
      shopSlug: undefined, categorySlug: (rec as { subcategory?: string | null }).subcategory ?? undefined, featured: (rec as { featured?: boolean }).featured ?? false, createdAt: rec.createdAt.toISOString(),
    }));
  }
  async updateListing(id: string, patch: Partial<ListingRecord>) {
    const existing = await this.p.listing.findUnique({ where: { id } });
    if (!existing) return null;
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.type !== undefined) data.type = patch.type;
    if (patch.price !== undefined) data.price = patch.price;
    if (patch.compareAt !== undefined) data.compareAt = patch.compareAt;
    if (patch.condition !== undefined) data.condition = patch.condition;
    if (patch.txMethod !== undefined) data.txMethod = patch.txMethod;
    if (patch.negotiable !== undefined) data.negotiable = patch.negotiable;
    if (patch.stock !== undefined) data.stock = patch.stock;
    if (patch.county !== undefined) data.county = patch.county;
    if (patch.town !== undefined) data.town = patch.town;
    if (patch.attributes !== undefined) data.attributes = patch.attributes;
    if (patch.categorySlug !== undefined) data.subcategory = patch.categorySlug;
    await this.p.listing.update({ where: { id }, data: data as never });
    if (patch.images !== undefined) {
      await this.p.listingImage.deleteMany({ where: { listingId: id } });
      if (patch.images.length > 0) {
        await this.p.listingImage.createMany({
          data: patch.images.map((url, i) => ({ listingId: id, url, position: i })),
        });
      }
    }
    return this.getListing(id);
  }
  async deleteListing(id: string) {
    await this.p.listingImage.deleteMany({ where: { listingId: id } }).catch(() => null);
    await this.p.listing.delete({ where: { id } }).catch(() => null);
  }
  async setListingStatus(id: string, status: string, adminId?: string, reason?: string) {
    await this.p.listing.update({ where: { id }, data: { status: status as never } });
    if (adminId) {
      await this.p.moderationAction.create({ data: { listingId: id, adminId, action: status, reason: reason ?? status } });
      await this.p.auditLog.create({ data: { actorId: adminId, action: `listing.${status}`, entity: "Listing", entityId: id, reason: reason ?? null } });
    }
  }
  async setListingFeatured(id: string, featured: boolean) {
    await this.p.listing.update({ where: { id }, data: { featured } });
  }

  async createOrder(o: Omit<OrderRecord, "id" | "createdAt" | "status" | "paymentStatus"> & { status?: string; paymentStatus?: string; id?: string }) {
    const id = o.id ?? uid("BD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
    const rec = await this.p.order.create({
      data: {
        id,
        name: o.name, phone: o.phone, email: o.email ?? null,
        county: o.county, town: o.town, address: o.address,
        deliveryMethod: o.deliveryMethod, paymentMethod: o.paymentMethod,
        subtotal: o.subtotal, discount: o.discount, delivery: o.delivery, total: o.total,
        status: (o.status ?? "pending") as never,
        paymentStatus: (o.paymentStatus ?? "pending") as never,
        payments: {
          create: { method: o.paymentMethod, amount: o.total, status: "pending" as never },
        },
        suborders: {
          create: o.suborders.map((s) => ({
            sellerName: s.seller, subtotal: s.subtotal, commission: s.commission,
            items: {
              create: s.items.map((i) => ({
                listingId: i.id && i.id.length < 40 ? i.id : null,
                title: i.title, qty: i.qty, price: i.price,
              })),
            },
          })),
        },
      },
      include: { suborders: { include: { items: true } } },
    });
    return {
      id: rec.id, name: rec.name, phone: rec.phone, email: rec.email ?? undefined,
      county: rec.county, town: rec.town, address: rec.address,
      deliveryMethod: rec.deliveryMethod, paymentMethod: rec.paymentMethod,
      subtotal: rec.subtotal, discount: rec.discount, delivery: rec.delivery, total: rec.total,
      status: rec.status as string, paymentStatus: rec.paymentStatus as string,
      items: o.items, suborders: o.suborders, createdAt: rec.createdAt.toISOString(),
    };
  }
  async getOrder(id: string) {
    const rec = await this.p.order.findUnique({
      where: { id }, include: { suborders: { include: { items: true } } },
    });
    if (!rec) return null;
    return {
      id: rec.id, name: rec.name, phone: rec.phone, email: rec.email ?? undefined,
      county: rec.county, town: rec.town, address: rec.address,
      deliveryMethod: rec.deliveryMethod, paymentMethod: rec.paymentMethod,
      subtotal: rec.subtotal, discount: rec.discount, delivery: rec.delivery, total: rec.total,
      status: rec.status as string, paymentStatus: rec.paymentStatus as string,
      items: rec.suborders.flatMap((s: { items: { title: string; qty: number; price: number }[] }) =>
        s.items.map((i) => ({ title: i.title, qty: i.qty, price: i.price }))),
      suborders: rec.suborders.map((s: { sellerName: string; items: { title: string; qty: number; price: number }[]; subtotal: number; commission: number }) => ({
        seller: s.sellerName,
        items: s.items.map((i) => ({ title: i.title, qty: i.qty, price: i.price })),
        subtotal: s.subtotal, commission: s.commission,
      })),
      createdAt: rec.createdAt.toISOString(),
    };
  }
  async listOrdersByPhone(phone: string) {
    const recs = await this.p.order.findMany({
      where: { phone }, orderBy: { createdAt: "desc" }, take: 50,
      include: { suborders: { include: { items: true } } },
    });
    return Promise.all(recs.map((r: { id: string }) => this.getOrder(r.id) as Promise<OrderRecord>));
  }
  async listOrdersByBuyer(buyerId: string) {
    const recs = await this.p.order.findMany({
      where: { buyerId }, orderBy: { createdAt: "desc" }, take: 50,
      include: { suborders: { include: { items: true } } },
    });
    return Promise.all(recs.map((r: { id: string }) => this.getOrder(r.id) as Promise<OrderRecord>));
  }
  async listOrders() {
    const recs = await this.p.order.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true } });
    return Promise.all(recs.map((r: { id: string }) => this.getOrder(r.id) as Promise<OrderRecord>));
  }
  async setOrderPayment(id: string, paymentStatus: string, providerRef?: string) {
    await this.p.order.update({ where: { id }, data: { paymentStatus: paymentStatus as never } });
    if (providerRef) {
      await this.p.payment.updateMany({ where: { orderId: id }, data: { status: paymentStatus as never, providerRef } });
    }
  }
  async setOrderStatus(id: string, status: string) {
    await this.p.order.update({ where: { id }, data: { status: status as never } });
  }
  async recordPayment(p: { orderId: string; method: string; amount: number; status: string; providerRef?: string }) {
    if (p.providerRef) {
      const existing = await this.p.payment.findUnique({ where: { providerRef: p.providerRef } });
      if (existing) return { id: existing.id, duplicate: true };
    }
    const rec = await this.p.payment.create({
      data: { orderId: p.orderId, method: p.method, amount: p.amount, status: p.status as never, providerRef: p.providerRef ?? null },
    });
    return { id: rec.id, duplicate: false };
  }

  async createEnquiry(e: Omit<EnquiryRecord, "id" | "createdAt">) {
    // Stored as a conversation-less message log in demo parity; Prisma uses Conversation+Message.
    const convo = await this.p.conversation.create({ data: { listingId: e.listingId, buyerId: e.phone, sellerId: e.listingId } });
    const msg = await this.p.message.create({ data: { conversationId: convo.id, senderId: e.phone, body: `${e.name} (${e.phone}): ${e.message}` } });
    return { ...e, id: msg.id, createdAt: msg.createdAt.toISOString() };
  }
  async createReport(r: Omit<ReportRecord, "id" | "createdAt" | "status">) {
    const rec = await this.p.report.create({ data: { listingId: r.listingId ?? null, reason: r.reason, status: "open" } });
    return { id: rec.id, listingId: r.listingId, reason: rec.reason, status: rec.status, createdAt: rec.createdAt.toISOString() };
  }
  async listReports(status?: string) {
    const recs = await this.p.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return recs.map((r: { id: string; listingId: string | null; reason: string; status: string; createdAt: Date }) => ({
      id: r.id, listingId: r.listingId ?? undefined, reason: r.reason, status: r.status, createdAt: r.createdAt.toISOString(),
    }));
  }
  async setReportStatus(id: string, status: string) {
    await this.p.report.update({ where: { id }, data: { status } });
  }

  async createShop(s: Omit<ShopRecord, "createdAt" | "verified">) {
    const rec = await this.p.shop.create({
      data: {
        slug: s.slug, name: s.name, description: s.description,
        businessCategory: s.businessCategory, county: s.county, town: s.town, phone: s.phone,
      },
    });
    return {
      slug: rec.slug, name: rec.name, description: rec.description,
      businessCategory: rec.businessCategory, county: rec.county, town: rec.town,
      phone: rec.phone, ownerId: s.ownerId, verified: rec.verified, createdAt: rec.createdAt.toISOString(),
    };
  }
  async getShopBySlug(slug: string) {
    const rec = await this.p.shop.findUnique({ where: { slug } });
    if (!rec) return null;
    return {
      slug: rec.slug, name: rec.name, description: rec.description,
      businessCategory: rec.businessCategory, county: rec.county, town: rec.town,
      phone: rec.phone, verified: rec.verified, createdAt: rec.createdAt.toISOString(),
    };
  }
  async listShops() {
    const recs = await this.p.shop.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return recs.map((rec: { slug: string; name: string; description: string; businessCategory: string; county: string; town: string; phone: string; verified: boolean; createdAt: Date }) => ({
      slug: rec.slug, name: rec.name, description: rec.description,
      businessCategory: rec.businessCategory, county: rec.county, town: rec.town,
      phone: rec.phone, verified: rec.verified, createdAt: rec.createdAt.toISOString(),
    }));
  }
  async setShopVerified(slug: string, verified: boolean) {
    await this.p.shop.update({ where: { slug }, data: { verified } });
  }

  async createVerification(v: Omit<VerificationRecord, "id" | "status" | "createdAt">) {
    const rec = await this.p.verification.create({
      data: { userId: v.userId, kind: v.kind, status: "pending", phone: v.phone ?? null, docUrl: v.docPath ?? null, fileName: v.fileName ?? null },
    });
    return {
      id: rec.id, userId: rec.userId, kind: rec.kind, status: rec.status,
      phone: rec.phone ?? undefined,
      docPath: rec.docUrl ?? undefined, fileName: rec.fileName ?? undefined,
      createdAt: rec.createdAt.toISOString(),
    };
  }
  async listVerifications(status?: string) {
    const recs = await this.p.verification.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return recs.map((r: { id: string; userId: string; kind: string; phone: string | null; status: string; docUrl: string | null; fileName: string | null; decidedBy: string | null; decidedAt: Date | null; createdAt: Date }) => ({
      id: r.id, userId: r.userId, kind: r.kind, status: r.status,
      phone: r.phone ?? undefined,
      docPath: r.docUrl ?? undefined, fileName: r.fileName ?? undefined,
      decidedBy: r.decidedBy ?? undefined, decidedAt: r.decidedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  }
  async decideVerification(id: string, approve: boolean, adminId: string) {
    const v = await this.p.verification.update({
      where: { id },
      data: { status: approve ? "approved" : "rejected", decidedBy: adminId, decidedAt: new Date() },
    });
    if (approve) {
      await this.p.user.updateMany({ where: { id: v.userId }, data: { verified: true } });
    }
  }

  async createReview(r: Omit<ReviewRecord, "id" | "status" | "createdAt">) {
    const rec = await this.p.review.create({
      data: {
        orderId: undefined, listingId: r.listingId ?? null, shopSlug: r.shopSlug ?? null,
        sellerName: r.sellerName ?? null, authorName: r.authorName,
        rating: r.rating, body: r.body ?? null,
        verifiedPurchase: r.verifiedPurchase, status: "pending",
      },
    });
    return {
      id: rec.id, orderId: r.orderId, listingId: r.listingId, shopSlug: r.shopSlug,
      sellerName: r.sellerName, authorName: rec.authorName ?? r.authorName,
      rating: rec.rating, body: rec.body ?? undefined,
      verifiedPurchase: rec.verifiedPurchase, status: rec.status, createdAt: rec.createdAt.toISOString(),
    };
  }
  async listApprovedReviewsForSeller(sellerName: string) {
    const recs = await this.p.review.findMany({
      where: { sellerName, status: "approved" },
      orderBy: { createdAt: "desc" }, take: 50,
    });
    return recs.map((r: { id: string; orderId: string | null; listingId: string | null; shopSlug: string | null; sellerName: string | null; authorName: string | null; rating: number; body: string | null; verifiedPurchase: boolean; status: string; createdAt: Date }) => ({
      id: r.id, listingId: r.listingId ?? undefined, shopSlug: r.shopSlug ?? undefined,
      sellerName: r.sellerName ?? undefined, authorName: r.authorName ?? "Buyer",
      rating: r.rating, body: r.body ?? undefined,
      verifiedPurchase: r.verifiedPurchase, status: r.status, createdAt: r.createdAt.toISOString(),
    }));
  }
  async listApprovedReviewsForShop(shopSlug: string) {
    const recs = await this.p.review.findMany({
      where: { shopSlug, status: "approved" },
      orderBy: { createdAt: "desc" }, take: 50,
    });
    return recs.map((r: { id: string; listingId: string | null; shopSlug: string | null; sellerName: string | null; authorName: string | null; rating: number; body: string | null; verifiedPurchase: boolean; status: string; createdAt: Date }) => ({
      id: r.id, listingId: r.listingId ?? undefined, shopSlug: r.shopSlug ?? undefined,
      sellerName: r.sellerName ?? undefined, authorName: r.authorName ?? "Buyer",
      rating: r.rating, body: r.body ?? undefined,
      verifiedPurchase: r.verifiedPurchase, status: r.status, createdAt: r.createdAt.toISOString(),
    }));
  }
  async listPendingReviews() {
    const recs = await this.p.review.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 200 });
    return recs.map((r: { id: string; authorName: string | null; rating: number; body: string | null; sellerName: string | null; shopSlug: string | null; createdAt: Date }) => ({
      id: r.id, authorName: r.authorName ?? "Buyer", rating: r.rating,
      body: r.body ?? undefined, sellerName: r.sellerName ?? undefined,
      shopSlug: r.shopSlug ?? undefined, verifiedPurchase: false,
      status: "pending", createdAt: r.createdAt.toISOString(),
    }));
  }
  async setReviewStatus(id: string, status: string) {
    await this.p.review.update({ where: { id }, data: { status } });
  }

  async createDispute(d: Omit<DisputeRecord, "id" | "status" | "createdAt">) {
    const rec = await this.p.dispute.create({
      data: {
        orderId: d.orderId, buyerName: d.buyerName ?? null, phone: d.phone ?? null,
        reason: d.reason, details: d.details ?? null, status: "open",
      },
    });
    return {
      id: rec.id, orderId: rec.orderId, buyerName: rec.buyerName ?? undefined,
      phone: rec.phone ?? undefined, reason: rec.reason, details: rec.details ?? undefined,
      status: rec.status, createdAt: rec.createdAt.toISOString(),
    };
  }
  async getDisputeByOrder(orderId: string) {
    const rec = await this.p.dispute.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });
    if (!rec) return null;
    return {
      id: rec.id, orderId: rec.orderId, buyerName: rec.buyerName ?? undefined,
      phone: rec.phone ?? undefined, reason: rec.reason, details: rec.details ?? undefined,
      status: rec.status, response: rec.response ?? undefined,
      decidedBy: rec.decidedBy ?? undefined, decidedAt: rec.decidedAt?.toISOString(),
      createdAt: rec.createdAt.toISOString(),
    };
  }
  async listDisputes(status?: string) {
    const recs = await this.p.dispute.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" }, take: 200,
    });
    return recs.map((r: { id: string; orderId: string; buyerName: string | null; phone: string | null; reason: string; details: string | null; status: string; response: string | null; createdAt: Date }) => ({
      id: r.id, orderId: r.orderId, buyerName: r.buyerName ?? undefined,
      phone: r.phone ?? undefined, reason: r.reason, details: r.details ?? undefined,
      status: r.status, response: r.response ?? undefined, createdAt: r.createdAt.toISOString(),
    }));
  }
  async respondDispute(id: string, response: string) {
    await this.p.dispute.update({ where: { id }, data: { response, status: "seller_responded" } });
  }
  async resolveDispute(id: string, outcome: "refund" | "reject", adminId: string) {
    await this.p.dispute.update({
      where: { id },
      data: { status: outcome === "refund" ? "resolved_refund" : "resolved_reject", decidedBy: adminId, decidedAt: new Date() },
    });
  }

  async createPromotion(p: { listingId: string; ownerId?: string; kind: string; days: number; amount: number }) {
    const startsAt = new Date();
    const rec = await this.p.promotion.create({
      data: {
        listingId: p.listingId,
        kind: p.kind,
        amount: p.amount,
        status: "pending_payment",
        startsAt,
        endsAt: new Date(startsAt.getTime() + p.days * 86400_000),
      },
    });
    return {
      id: rec.id, listingId: rec.listingId, ownerId: p.ownerId, kind: rec.kind,
      days: p.days, amount: rec.amount, status: rec.status,
      startsAt: rec.startsAt.toISOString(), endsAt: rec.endsAt.toISOString(),
      createdAt: rec.startsAt.toISOString(),
    };
  }
  async listPromotionsForOwner(ownerId: string) {
    const profile = await this.p.sellerProfile.findUnique({ where: { userId: ownerId } }).catch(() => null);
    if (!profile) return [];
    const listings = await this.p.listing.findMany({ where: { sellerProfileId: profile.id }, select: { id: true } });
    const ids = listings.map((l: { id: string }) => l.id);
    if (ids.length === 0) return [];
    const recs = await this.p.promotion.findMany({ where: { listingId: { in: ids } }, orderBy: { startsAt: "desc" }, take: 200 });
    return recs.map((r: { id: string; listingId: string; kind: string; amount: number; status: string; startsAt: Date; endsAt: Date }) => ({
      id: r.id, listingId: r.listingId, ownerId, kind: r.kind,
      days: Math.max(1, Math.round((+r.endsAt - +r.startsAt) / 86400_000)),
      amount: r.amount, status: r.status,
      startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), createdAt: r.startsAt.toISOString(),
    }));
  }
  async getPromotion(id: string) {
    const r = await this.p.promotion.findUnique({ where: { id } }).catch(() => null);
    if (!r) return null;
    const listing = await this.p.listing.findUnique({ where: { id: r.listingId }, include: { seller: true } }).catch(() => null);
    return {
      id: r.id, listingId: r.listingId,
      ownerId: (listing?.seller as { userId?: string } | null)?.userId,
      kind: r.kind,
      days: Math.max(1, Math.round((+r.endsAt - +r.startsAt) / 86400_000)),
      amount: r.amount, status: r.status,
      startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), createdAt: r.startsAt.toISOString(),
    };
  }
  async listPromotions(status?: string) {
    const recs = await this.p.promotion.findMany({
      where: status ? { status } : undefined,
      orderBy: { startsAt: "desc" }, take: 200,
    });
    return recs.map((r: { id: string; listingId: string; kind: string; amount: number; status: string; startsAt: Date; endsAt: Date }) => ({
      id: r.id, listingId: r.listingId, kind: r.kind,
      days: Math.max(1, Math.round((+r.endsAt - +r.startsAt) / 86400_000)),
      amount: r.amount, status: r.status,
      startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), createdAt: r.startsAt.toISOString(),
    }));
  }
  async listPromotionsByListing(listingId: string) {
    const recs = await this.p.promotion.findMany({ where: { listingId }, orderBy: { startsAt: "desc" }, take: 50 });
    return recs.map((r: { id: string; listingId: string; kind: string; amount: number; status: string; startsAt: Date; endsAt: Date }) => ({
      id: r.id, listingId: r.listingId, kind: r.kind,
      days: Math.max(1, Math.round((+r.endsAt - +r.startsAt) / 86400_000)),
      amount: r.amount, status: r.status,
      startsAt: r.startsAt.toISOString(), endsAt: r.endsAt.toISOString(), createdAt: r.startsAt.toISOString(),
    }));
  }
  async setPromotionStatus(id: string, status: string) {
    await this.p.promotion.update({ where: { id }, data: { status } });
  }

  async createConversation(c: Omit<ConversationRecord, "id" | "createdAt"> & { firstMessage: { senderId: string; senderLabel: string; body: string; bodyHtml: string } }) {
    const convo = await this.p.conversation.create({
      data: {
        listingId: c.listingId ?? null,
        buyerId: c.buyerId ?? c.buyerPhone ?? "guest",
        sellerId: c.sellerId ?? (c.sellerName ? `seller:${c.sellerName}` : "unknown"),
      },
    });
    await this.p.message.create({
      data: { conversationId: convo.id, senderId: c.firstMessage.senderId, body: c.firstMessage.body },
    });
    return {
      id: convo.id, listingId: c.listingId, listingTitle: c.listingTitle,
      sellerName: c.sellerName, sellerId: c.sellerId, buyerId: c.buyerId,
      buyerName: c.buyerName, buyerPhone: c.buyerPhone, createdAt: convo.createdAt.toISOString(),
    };
  }
  async getConversation(id: string) {
    const c = await this.p.conversation.findUnique({ where: { id } });
    if (!c) return null;
    return { id: c.id, listingId: c.listingId ?? undefined, createdAt: c.createdAt.toISOString() };
  }
  async listConversations(identity: { userId?: string; phone?: string; sellerName?: string }) {
    const ors = [];
    if (identity.userId) ors.push({ buyerId: identity.userId }, { sellerId: identity.userId });
    if (identity.phone) ors.push({ buyerId: identity.phone }, { buyerId: `phone:${identity.phone}` });
    // Prisma stores the seller link as `seller:<display name>` when no account id is known.
    if (identity.sellerName) ors.push({ sellerId: `seller:${identity.sellerName}` });
    if (ors.length === 0) return [];
    const viewer = identity.userId ?? (identity.phone ? `phone:${identity.phone}` : "");
    const convos = await this.p.conversation.findMany({
      where: { OR: ors },
      orderBy: { createdAt: "desc" }, take: 100,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    return convos.map((c: { id: string; listingId: string | null; createdAt: Date; messages: { body: string; createdAt: Date; senderId: string; readAt: Date | null }[] }) => {
      const last = c.messages[0];
      return {
        id: c.id, listingId: c.listingId ?? undefined, createdAt: c.createdAt.toISOString(),
        lastMessage: last?.body.slice(0, 120), lastAt: last?.createdAt.toISOString() ?? c.createdAt.toISOString(),
        unread: c.messages.filter((m) => m.senderId !== viewer && !m.readAt).length,
      };
    });
  }
  async listMessages(conversationId: string) {
    const recs = await this.p.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 200 });
    return recs.map((m: { id: string; conversationId: string; senderId: string; body: string; readAt: Date | null; createdAt: Date }) => ({
      id: m.id, conversationId: m.conversationId, senderId: m.senderId,
      senderLabel: m.senderId.startsWith("phone:") ? m.senderId.slice(6) : "Seller",
      body: m.body, read: !!m.readAt, createdAt: m.createdAt.toISOString(),
    }));
  }
  async addMessage(m: Omit<MessageRecord, "id" | "read" | "createdAt">) {
    const rec = await this.p.message.create({
      data: { conversationId: m.conversationId, senderId: m.senderId, body: m.body },
    });
    return {
      id: rec.id, conversationId: rec.conversationId, senderId: rec.senderId,
      senderLabel: m.senderLabel, body: rec.body, bodyHtml: m.bodyHtml,
      read: false, createdAt: rec.createdAt.toISOString(),
    };
  }
  async markConversationRead(conversationId: string, viewerId: string) {
    await this.p.message.updateMany({
      where: { conversationId, NOT: { senderId: viewerId }, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

/* ------------------------------- selector -------------------------------- */

let demo: DemoStore | null = null;
let prismaStore: PrismaStore | null = null;

/** Returns the Prisma backend when a database is configured, else demo. */
export function getStore(): Store {
  const client = db() as PrismaClient | null;
  if (client) {
    if (!prismaStore) prismaStore = new PrismaStore(client);
    return prismaStore;
  }
  if (!demo) demo = new DemoStore();
  return demo;
}

/** Test hook: fresh isolated demo store. */
export function freshDemoStore(): Store {
  return new DemoStore();
}

/**
 * Build/runtime-safe read for prerendered pages: if DATABASE_URL is set but
 * the database is unreachable (or unmigrated), return the fallback instead of
 * crashing static generation. Writes must never use this — they fail loudly.
 */
export async function storeRead<T>(fn: (s: Store) => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn(getStore());
  } catch (e) {
    console.warn("[store] database read failed, using fallback:", (e as Error)?.message ?? e);
    return fallback;
  }
}
