/**
 * Billing documents for plans + promotions.
 *
 * Plan invoices have always lived in the `invoices` setting. Promotion boosts
 * now share the same ledger, so the invoice centre can show one consistent
 * history and every purchase can be downloaded or emailed as a branded PDF.
 * Legacy boosts (created before this ledger existed) are derived from their
 * Promotion row, so older receipts do not disappear.
 */
import { getStore, type PromotionRecord, type ShopRecord, type Store, type UserRecord } from "./store";
import { SHOP_PLANS } from "@/data/catalog";

export const INVOICES_SETTING = "invoices";

/** Readable, collision-resistant id for a plan purchase. Promotions use `promo:<id>`. */
export function newPlanInvoiceId(scope: string): string {
  const prefix = scope.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8) || "chap";
  return `INV-${prefix}-${Date.now().toString(36)}`;
}

export type InvoiceKind = "plan" | "promotion";
export type StoredInvoiceStatus = "paid" | "pending" | "cancelled" | "void";
export type InvoiceStatus = "paid" | "pending" | "void";

export type StoredInvoice = {
  /** External, stable invoice id. Plan ids are `INV-…`; promotion ids use `promo:<promoId>`. */
  id: string;
  kind?: InvoiceKind;
  /** Human-facing invoice number (defaults to id). */
  number?: string;
  /** Shop owner / promotion owner. Persisted on new rows so receipts survive renames. */
  ownerId?: string;
  /** Legacy personal-plan invoices use this field. */
  userId?: string;
  shopSlug?: string;
  shopName?: string;
  promoId?: string;
  listingId?: string;
  listingTitle?: string;
  planId?: string;
  description?: string;
  amount: number;
  at: string;
  renewsAt?: string;
  dueAt?: string;
  paidAt?: string;
  method: string;
  status: StoredInvoiceStatus;
  providerRef?: string;
  customerName?: string;
  customerEmail?: string;
  emailedAt?: string;
  paidEmailedAt?: string;
};

/** Backwards-compatible name used by the plan checkout routes. */
export type PlanInvoice = Omit<StoredInvoice, "kind"> & { kind?: "plan" };

export type InvoiceLine = {
  description: string;
  detail?: string;
  quantity: number;
  unitAmount: number;
  amount: number;
};

export type InvoiceView = {
  id: string;
  number: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  statusLabel: "Paid" | "Unpaid" | "Void";
  amount: number;
  currency: "KES";
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  renewsAt?: string;
  method: string;
  methodLabel: string;
  reference?: string;
  description: string;
  planId?: string;
  promos?: { id: string; kind: string; days: number; status: string };
  listing?: { id: string; title: string };
  shop?: { slug: string; name: string };
  customer: { name: string; email: string; phone: string; businessName?: string };
  ownerId?: string;
  userId?: string;
  lineItems: InvoiceLine[];
  /** Included for compatibility with the older plan panel shape. */
  at: string;
  shopSlug?: string;
  promoId?: string;
  downloadUrl: string;
};

export const invoicePromoId = (promoId: string) => `promo:${promoId}`;

export function invoicePromoNumber(promoId: string): string {
  const compact = promoId.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase();
  return `INV-B-${compact || "BOOST"}`;
}

export function isInvoicePaid(status: unknown): boolean {
  return String(status ?? "").toLowerCase() === "paid";
}

function normalizedStatus(raw: unknown): StoredInvoiceStatus {
  const v = String(raw ?? "").toLowerCase();
  if (v === "paid") return "paid";
  if (v === "cancelled" || v === "canceled") return "cancelled";
  if (v === "void") return "void";
  if (v === "pending" || v === "unpaid" || v === "pending_payment") return "pending";
  return "pending";
}

function normalizeStored(raw: Partial<StoredInvoice> & { id: string; amount: number; at: string; method: string }): StoredInvoice {
  return {
    ...raw,
    kind: raw.kind === "promotion" ? "promotion" : "plan",
    id: String(raw.id),
    amount: Number(raw.amount) || 0,
    at: raw.at ? String(raw.at) : new Date().toISOString(),
    method: String(raw.method || "mpesa"),
    status: normalizedStatus(raw.status),
    description: raw.description ? String(raw.description) : undefined,
  };
}

export async function readInvoiceLedger(store: Store = getStore()): Promise<StoredInvoice[]> {
  const rows = ((await store.getSetting(INVOICES_SETTING).catch(() => null)) as
    | (Partial<StoredInvoice> & { id: string; amount: number; at: string; method: string })[]
    | null) ?? [];
  return Array.isArray(rows)
    ? rows
        .filter((row) => row && typeof row === "object" && typeof row.id === "string")
        .map((row) => normalizeStored(row))
    : [];
}

export async function writeInvoiceLedger(items: StoredInvoice[], store: Store = getStore()): Promise<void> {
  // Keep the newest 500 billing documents. The list is newest-first.
  await store
    .setSetting(INVOICES_SETTING, items.slice(0, 500))
    .catch(() => {});
}

/** Upsert by id, preserving email timestamps when a payment status changes. */
export async function saveInvoiceRecord(record: StoredInvoice, store: Store = getStore()): Promise<StoredInvoice> {
  const ledger = await readInvoiceLedger(store);
  const existing = ledger.find((row) => row.id === record.id);
  // Do not blank persisted billing details when a later activation call only
  // knows the promotion/plan status.
  const definedRecord = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as StoredInvoice;
  const merged: StoredInvoice = {
    ...existing,
    ...definedRecord,
    emailedAt: record.emailedAt ?? existing?.emailedAt,
    paidEmailedAt: record.paidEmailedAt ?? existing?.paidEmailedAt,
  };
  await writeInvoiceLedger([merged, ...ledger.filter((row) => row.id !== record.id)], store);
  return merged;
}

export async function updateInvoiceRecord(
  id: string,
  patch: Partial<StoredInvoice>,
  store: Store = getStore()
): Promise<StoredInvoice | null> {
  const ledger = await readInvoiceLedger(store);
  const existing = ledger.find((row) => row.id === id);
  if (!existing) return null;
  const next: StoredInvoice = { ...existing, ...patch, id: existing.id };
  await writeInvoiceLedger([next, ...ledger.filter((row) => row.id !== id)], store);
  return next;
}

export async function markInvoicePaid(
  id: string,
  providerRef?: string,
  store: Store = getStore()
): Promise<StoredInvoice | null> {
  return updateInvoiceRecord(
    id,
    {
      status: "paid",
      paidAt: new Date().toISOString(),
      ...(providerRef ? { providerRef } : {}),
    },
    store
  );
}

export async function markInvoiceEmailSent(
  id: string,
  kind: "created" | "paid",
  store: Store = getStore()
): Promise<void> {
  const ledger = await readInvoiceLedger(store);
  const idx = ledger.findIndex((row) => row.id === id);
  if (idx < 0) return;
  const at = new Date().toISOString();
  const next: StoredInvoice = {
    ...ledger[idx],
    ...(kind === "paid" ? { paidEmailedAt: at } : { emailedAt: at }),
  };
  // A paid receipt also counts as delivery of the invoice.
  if (kind === "paid" && !next.emailedAt) next.emailedAt = at;
  await writeInvoiceLedger([next, ...ledger.filter((_, i) => i !== idx)], store);
}

export type PromotionInvoiceInput = {
  promo: PromotionRecord;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  listingTitle?: string;
  method?: string;
  status?: StoredInvoiceStatus;
  providerRef?: string;
};

/** Create/update the ledger row for a boost purchase. */
export async function recordPromotionInvoice(
  input: PromotionInvoiceInput,
  store: Store = getStore()
): Promise<StoredInvoice> {
  const { promo } = input;
  const status: StoredInvoiceStatus =
    input.status ??
    (promo.status === "active" || promo.status === "expired"
      ? "paid"
      : promo.status === "cancelled"
        ? "cancelled"
        : "pending");
  const method = input.method || "mpesa";
  const record: StoredInvoice = {
    id: invoicePromoId(promo.id),
    kind: "promotion",
    number: invoicePromoNumber(promo.id),
    ownerId: input.ownerId ?? promo.ownerId,
    promoId: promo.id,
    listingId: promo.listingId,
    listingTitle: input.listingTitle,
    amount: promo.amount,
    at: promo.createdAt || promo.startsAt,
    dueAt: promo.createdAt || promo.startsAt,
    method,
    status,
    providerRef: input.providerRef,
    customerName: input.ownerName,
    customerEmail: input.ownerEmail,
    description: `${promo.kind === "featured" ? "Featured" : promo.kind === "sponsored" ? "Sponsored" : "Listing"} boost - ${promo.days} days`,
    ...(status === "paid" ? { paidAt: promo.startsAt } : {}),
  };
  return saveInvoiceRecord(record, store);
}

/** Sync a promotion invoice after activation / admin confirmation. */
export async function activatePromotionInvoice(
  promo: PromotionRecord,
  providerRef?: string,
  store: Store = getStore()
): Promise<StoredInvoice> {
  return recordPromotionInvoice(
    {
      promo,
      method: "mpesa",
      status: "paid",
      providerRef,
    },
    store
  );
}

function storePromoStatusToInvoice(promo: PromotionRecord): StoredInvoiceStatus {
  return promo.status === "active" || promo.status === "expired"
    ? "paid"
    : promo.status === "cancelled"
      ? "cancelled"
      : "pending";
}

function displayStatus(kind: InvoiceKind, stored: StoredInvoiceStatus, promo?: PromotionRecord | null): InvoiceStatus {
  if (kind === "promotion") {
    if (stored === "paid") return "paid";
    if (promo?.status === "active" || promo?.status === "expired") return "paid";
    if (stored === "cancelled" || promo?.status === "cancelled") return "void";
    return "pending";
  }
  if (stored === "paid") return "paid";
  if (stored === "cancelled" || stored === "void") return "void";
  return "pending";
}

function planName(planId?: string): string {
  return SHOP_PLANS.find((p) => p.id === planId)?.name ?? (planId ? planId[0].toUpperCase() + planId.slice(1) : "Seller");
}

function methodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "mpesa" || m === "m-pesa") return "M-Pesa";
  if (m === "wallet") return "Chap wallet";
  if (m === "card") return "Card";
  if (m === "referral") return "Referral reward";
  return method ? method[0].toUpperCase() + method.slice(1) : "M-Pesa";
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function invoiceDateLabel(iso?: string): string {
  return formatDate(iso);
}

async function ownerFor(
  stored: StoredInvoice,
  shop: ShopRecord | null,
  promo: PromotionRecord | null,
  listingOwnerId: string | undefined,
  store: Store
): Promise<UserRecord | null> {
  const id = stored.ownerId || stored.userId || shop?.ownerId || promo?.ownerId || listingOwnerId;
  return id ? store.findUserById(id).catch(() => null) : null;
}

async function hydrateInvoice(
  stored: StoredInvoice,
  promosById: Map<string, PromotionRecord> = new Map(),
  store: Store = getStore()
): Promise<InvoiceView> {
  const kind: InvoiceKind = stored.kind === "promotion" ? "promotion" : "plan";
  const promo =
    (stored.promoId && promosById.get(stored.promoId)) ||
    (stored.promoId ? await store.getPromotion(stored.promoId).catch(() => null) : null);
  const listingId = stored.listingId || promo?.listingId;
  const listing = listingId ? await store.getListing(listingId).catch(() => null) : null;
  const shopSlug = stored.shopSlug || listing?.shopSlug;
  const shop = shopSlug ? await store.getShopBySlug(shopSlug).catch(() => null) : null;
  const owner = await ownerFor(stored, shop, promo, listing?.ownerId, store);
  const status = displayStatus(kind, stored.status, promo);
  // Display document numbers in upper case (internal ids remain untouched).
  const number = (stored.number || stored.id).toUpperCase();
  const plan = stored.planId;
  const listingTitle = stored.listingTitle || listing?.title;
  const shopName = stored.shopName || shop?.name;
  const description =
    stored.description ||
    (kind === "promotion"
      ? `${promo?.kind === "sponsored" ? "Sponsored" : "Featured"} boost - ${promo?.days ?? 7} days`
      : `${planName(plan)} ${shopName ? "shop plan" : "seller plan"} - monthly subscription`);
  const lineDescription =
    kind === "promotion"
      ? `${promo?.kind === "sponsored" ? "Sponsored" : "Featured"} boost`
      : `${planName(plan)} ${shopName ? "shop plan" : "seller plan"}`;
  const lineDetail =
    kind === "promotion"
      ? `${promo?.days ?? 7} days${listingTitle ? ` - ${listingTitle}` : ""}`
      : shopName
        ? `${shopName} - monthly subscription${stored.renewsAt ? ` - renews ${formatDate(stored.renewsAt)}` : ""}`
        : `Personal seller plan - monthly subscription${stored.renewsAt ? ` - renews ${formatDate(stored.renewsAt)}` : ""}`;
  const displayName =
    stored.customerName ||
    owner?.businessName ||
    owner?.name ||
    (shopName ? shopName : "Chap seller");
  return {
    id: stored.id,
    number,
    kind,
    status,
    statusLabel: status === "paid" ? "Paid" : status === "void" ? "Void" : "Unpaid",
    amount: stored.amount,
    currency: "KES",
    issuedAt: stored.at,
    dueAt: stored.dueAt || (status === "pending" ? stored.at : undefined),
    paidAt: stored.paidAt || (status === "paid" ? promo?.startsAt || stored.at : undefined),
    renewsAt: stored.renewsAt,
    method: stored.method,
    methodLabel: methodLabel(stored.method),
    reference: stored.providerRef,
    description,
    planId: plan,
    promos: promo ? { id: promo.id, kind: promo.kind, days: promo.days, status: promo.status } : undefined,
    listing: listing ? { id: listing.id, title: listing.title } : listingTitle ? { id: listingId || "", title: listingTitle } : undefined,
    shop: shop ? { slug: shop.slug, name: shop.name } : shopSlug ? { slug: shopSlug, name: shopName || shopSlug } : undefined,
    customer: {
      name: displayName,
      email: stored.customerEmail || owner?.email || "",
      phone: owner?.phone || "",
      businessName: owner?.businessName,
    },
    ownerId: stored.ownerId || stored.userId || owner?.id,
    userId: stored.userId,
    lineItems: [
      {
        description: lineDescription,
        detail: lineDetail,
        quantity: 1,
        unitAmount: stored.amount,
        amount: stored.amount,
      },
    ],
    at: stored.at,
    shopSlug: shopSlug || undefined,
    promoId: promo?.id || stored.promoId,
    downloadUrl: `/api/invoices/${encodeURIComponent(stored.id)}/pdf`,
  };
}

function syntheticPromotionInvoice(
  promo: PromotionRecord,
  ownerId?: string
): StoredInvoice {
  return normalizeStored({
    id: invoicePromoId(promo.id),
    kind: "promotion",
    number: invoicePromoNumber(promo.id),
    ownerId: ownerId ?? promo.ownerId,
    promoId: promo.id,
    listingId: promo.listingId,
    amount: promo.amount,
    at: promo.createdAt || promo.startsAt,
    dueAt: promo.createdAt || promo.startsAt,
    method: "mpesa",
    status: storePromoStatusToInvoice(promo),
    ...(promo.status === "active" || promo.status === "expired" ? { paidAt: promo.startsAt } : {}),
    description: `${promo.kind === "featured" ? "Featured" : promo.kind === "sponsored" ? "Sponsored" : "Listing"} boost - ${promo.days} days`,
  });
}

/** Build the owner-facing receipt list, including legacy promotions. */
export async function listInvoicesForOwner(userId: string, store: Store = getStore()): Promise<InvoiceView[]> {
  const [ledger, ownedShops, promos] = await Promise.all([
    readInvoiceLedger(store),
    store.listShopsByOwner(userId).catch(() => []),
    store.listPromotionsForOwner(userId).catch(() => []),
  ]);
  const slugs = new Set(ownedShops.map((s) => s.slug));
  const promoMap = new Map(promos.map((p) => [p.id, p]));
  const ledgerPromoIds = new Set(ledger.filter((row) => row.kind === "promotion" && row.promoId).map((row) => row.promoId!));
  const synthetic = promos
    .filter((promo) => !ledgerPromoIds.has(promo.id))
    .map((promo) => syntheticPromotionInvoice(promo, userId));
  const visible = ledger.filter(
    (row) =>
      row.ownerId === userId ||
      row.userId === userId ||
      (row.shopSlug ? slugs.has(row.shopSlug) : false) ||
      (row.kind === "promotion" && row.promoId ? promoMap.has(row.promoId) : false)
  );
  const rows = [...visible, ...synthetic].sort(
    (a, b) => +new Date(b.at) - +new Date(a.at) || a.id.localeCompare(b.id)
  );
  const views = await Promise.all(rows.slice(0, 300).map((row) => hydrateInvoice(row, promoMap, store)));
  return views.sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt));
}

/** Admin export/history. Includes plan invoices and every promotion (legacy + ledger). */
export async function listInvoicesForAdmin(store: Store = getStore()): Promise<InvoiceView[]> {
  const [ledger, promos] = await Promise.all([
    readInvoiceLedger(store),
    store.listPromotions().catch(() => []),
  ]);
  const promoMap = new Map(promos.map((p) => [p.id, p]));
  const ledgerPromoIds = new Set(ledger.filter((row) => row.kind === "promotion" && row.promoId).map((row) => row.promoId!));
  const synthetic = promos
    .filter((promo) => !ledgerPromoIds.has(promo.id))
    .map((promo) => syntheticPromotionInvoice(promo));
  const rows = [...ledger, ...synthetic].sort(
    (a, b) => +new Date(b.at) - +new Date(a.at) || a.id.localeCompare(b.id)
  );
  return Promise.all(rows.slice(0, 500).map((row) => hydrateInvoice(row, promoMap, store)));
}

/** Resolve one invoice without an auth check (internal callers: PDF/email/activation). */
export async function getInvoiceById(id: string, store: Store = getStore()): Promise<InvoiceView | null> {
  let decoded = String(id || "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // A malformed escape never matches an invoice; keep the raw id.
  }
  const ledger = await readInvoiceLedger(store);
  let stored =
    ledger.find((row) => row.id === decoded) ||
    ledger.find((row) => row.promoId && invoicePromoId(row.promoId) === decoded) ||
    ledger.find((row) => row.promoId && row.promoId === decoded) ||
    null;
  if (!stored) {
    const promoId = decoded.startsWith("promo:") ? decoded.slice("promo:".length) : decoded;
    const promo = await store.getPromotion(promoId).catch(() => null);
    if (promo) {
      stored = ledger.find((row) => row.promoId === promoId) || syntheticPromotionInvoice(promo);
    }
  }
  if (!stored) return null;
  return hydrateInvoice(stored, new Map(), store);
}

export async function getInvoiceForUser(
  id: string,
  user: { id: string; role: string },
  store: Store = getStore()
): Promise<InvoiceView | null> {
  const invoice = await getInvoiceById(id, store);
  if (!invoice) return null;
  if (user.role === "ADMIN") return invoice;
  if (invoice.ownerId === user.id || invoice.userId === user.id) return invoice;
  const owned = await store.listShopsByOwner(user.id).catch(() => []);
  if (invoice.shopSlug && owned.some((shop) => shop.slug === invoice.shopSlug)) return invoice;
  return null;
}

/** Locate the ledger row for a promotion (used when a payment confirms). */
export async function getPromotionInvoiceRecord(
  promoId: string,
  store: Store = getStore()
): Promise<StoredInvoice | null> {
  const ledger = await readInvoiceLedger(store);
  return ledger.find((row) => row.promoId === promoId || row.id === invoicePromoId(promoId)) ?? null;
}
