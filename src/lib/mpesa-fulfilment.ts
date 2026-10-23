import type { Store } from "./store";
import { pendingPlanKey, pendingSellerPlanKey } from "./plans";
import { logAudit } from "./audit";
import { querySTKPush } from "./payments";

export type PlanLink = {
  promoId?: string;
  planShop?: string;
  planUser?: string;
  planId?: string;
};

export type MpesaFulfilmentRef = {
  orderRef?: string;
  checkoutRequestId?: string;
  amount?: number;
  providerRef?: string;
};

/**
 * Activate a promotion/plan linked to a Daraja request id, amount-checked.
 * Boosts and plan checkouts have no Order row, so the callback must fulfil
 * them here rather than writing a Payment (Payment.orderId is an order FK).
 * Returns true when something was activated; safe to retry because promotion
 * activation and plan assignment are idempotent.
 */
export async function fulfilLinkedPurchase(
  v: MpesaFulfilmentRef,
  store: Store
): Promise<boolean> {
  const refs = [...new Set([v.checkoutRequestId, v.orderRef].filter(Boolean))] as string[];
  let link: PlanLink | null = null;
  for (const ref of refs) {
    link = (await store.getSetting(`mpesa_link:${ref}`).catch(() => null)) as PlanLink | null;
    if (link && (link.promoId || link.planShop || link.planUser)) break;
    link = null;
  }
  if (!link) return false;

  const amountOk = (expected: number | undefined) =>
    v.amount === undefined || expected === undefined || v.amount === expected;
  const consumeLink = async () => {
    for (const ref of refs) {
      await store.deleteSetting(`mpesa_link:${ref}`).catch(() => {});
    }
  };

  if (link.promoId) {
    const promo = await store.getPromotion(link.promoId).catch(() => null);
    if (!promo) return false;
    if (!amountOk(promo.amount)) {
      await logAudit({
        action: "payment.amount_mismatch",
        entity: "promotion",
        entityId: link.promoId,
        reason: `got=${v.amount} want=${promo.amount}`,
      }).catch(() => {});
      return false;
    }
    await store.activatePromotion(link.promoId).catch(() => null);
    // The read path derives featured from live promos, but keep the stored
    // flag in sync for catalogue/search paths that read it directly.
    await store.setListingFeatured(promo.listingId, true).catch(() => {});
    if (promo.ownerId) {
      const { notifyUser } = await import("./notifications");
      await notifyUser({
        userId: promo.ownerId,
        type: "promotion",
        title: "Boost is live 🚀",
        body: `Your paid boost is active for ${promo.days} day${promo.days === 1 ? "" : "s"}.`,
        link: "/dashboard/promotion",
      }).catch(() => null);
    }
    await logAudit({
      action: "payment.boost",
      entity: "promotion",
      entityId: link.promoId,
      reason: `KES ${v.amount ?? promo.amount} · ${promo.kind} ${promo.days}d`,
    }).catch(() => {});
    await consumeLink();
    return true;
  }

  const settleInvoice = async (invoiceId?: string) => {
    if (!invoiceId) return;
    const inv = ((await store.getSetting("invoices").catch(() => null)) as { id: string }[] | null) ?? [];
    await store
      .setSetting(
        "invoices",
        inv.map((i) => (i.id === invoiceId ? { ...i, status: "paid", providerRef: v.providerRef } : i))
      )
      .catch(() => {});
  };

  if (link.planShop && link.planId) {
    const pending = (await store.getSetting(pendingPlanKey(link.planShop)).catch(() => null)) as
      | { amount?: number; invoiceId?: string }
      | null;
    if (pending && !amountOk(pending.amount)) {
      await logAudit({
        action: "payment.amount_mismatch",
        entity: "shop",
        entityId: link.planShop,
        reason: `got=${v.amount} want=${pending.amount}`,
      }).catch(() => {});
      return false;
    }
    await store.setShopPlan(link.planShop, link.planId).catch(() => {});
    const shop = await store.getShopBySlug(link.planShop).catch(() => null);
    if (shop?.ownerId) await store.setUserPlan(shop.ownerId, "free").catch(() => {});
    await store.setSetting(pendingPlanKey(link.planShop), null).catch(() => {});
    await settleInvoice(pending?.invoiceId);
    if (shop?.ownerId) {
      const { notifyUser } = await import("./notifications");
      await notifyUser({
        userId: shop.ownerId,
        type: "system",
        title: "Shop plan activated ✓",
        body: `${shop.name} is now on the ${link.planId} plan. Your paid month starts now.`,
        link: "/dashboard/shop",
      }).catch(() => null);
    }
    await logAudit({
      action: "payment.plan",
      entity: "shop",
      entityId: link.planShop,
      reason: `${link.planId} · KES ${v.amount ?? pending?.amount ?? "?"}`,
    }).catch(() => {});
    await consumeLink();
    return true;
  }

  if (link.planUser && link.planId) {
    const pending = (await store.getSetting(pendingSellerPlanKey(link.planUser)).catch(() => null)) as
      | { amount?: string | number; invoiceId?: string }
      | null;
    const expected = typeof pending?.amount === "number" ? pending.amount : undefined;
    if (pending && !amountOk(expected)) {
      await logAudit({
        action: "payment.amount_mismatch",
        entity: "user",
        entityId: link.planUser,
        reason: `got=${v.amount} want=${pending.amount}`,
      }).catch(() => {});
      return false;
    }
    // A seller has one plan: if they opened a shop while this personal
    // checkout was pending, activate the storefront plan instead.
    const shops = await store.listShopsByOwner(link.planUser).catch(() => []);
    const shop = shops[0] ?? null;
    if (shop) {
      await store.setShopPlan(shop.slug, link.planId).catch(() => {});
      await store.setUserPlan(link.planUser, "free").catch(() => {});
    } else {
      await store.setUserPlan(link.planUser, link.planId).catch(() => {});
    }
    await store.setSetting(pendingSellerPlanKey(link.planUser), null).catch(() => {});
    await settleInvoice(pending?.invoiceId);
    const { notifyUser } = await import("./notifications");
    await notifyUser({
      userId: link.planUser,
      type: "system",
      title: shop ? "Shop plan activated ✓" : "Seller plan activated ✓",
      body: shop
        ? `${shop.name} is now on the ${link.planId} plan. Your paid month starts now.`
        : `Your ${link.planId} seller plan is active. Your paid month starts now.`,
      link: "/dashboard/plan",
    }).catch(() => null);
    await logAudit({
      action: "payment.plan",
      entity: "user",
      entityId: link.planUser,
      reason: `${link.planId} · KES ${v.amount ?? expected ?? "?"}`,
    }).catch(() => {});
    await consumeLink();
    return true;
  }

  return false;
}

export type ReconcileResult = {
  checked: number;
  activated: number;
  pending: number;
  skipped: number;
  errors: number;
  details: { ref: string; target: string; outcome: "activated" | "pending" | "skipped" | "error"; message?: string }[];
};

/**
 * Ops fallback for lost/failed callbacks. Scans pending `mpesa_link:*` rows,
 * asks Daraja whether each STK push actually succeeded, and applies the linked
 * promotion/plan only when M-Pesa returns ResultCode 0. Safe to re-run.
 */
export async function reconcilePendingMpesaLinks(store: Store, limit = 20): Promise<ReconcileResult> {
  const rows = await store.listSettings("mpesa_link:").catch(() => []);
  const max = Math.max(1, Math.min(Math.round(limit), 50));
  const out: ReconcileResult = { checked: 0, activated: 0, pending: 0, skipped: 0, errors: 0, details: [] };

  for (const row of rows.slice(0, max)) {
    out.checked += 1;
    const ref = row.key.slice("mpesa_link:".length);
    const link = (row.value ?? {}) as PlanLink;
    if (!row.value || typeof row.value !== "object") {
      await store.deleteSetting(row.key).catch(() => {});
      out.skipped += 1;
      out.details.push({ ref, target: "", outcome: "skipped", message: "Empty link tombstone." });
      continue;
    }
    let target = "";
    let amount: number | undefined;
    let pending = false;

    if (link.promoId) {
      const promo = await store.getPromotion(link.promoId).catch(() => null);
      target = `promotion:${link.promoId}`;
      if (!promo) {
        out.skipped += 1;
        out.details.push({ ref, target, outcome: "skipped", message: "Promotion not found." });
        continue;
      }
      if (promo.status !== "pending_payment") {
        await store.setSetting(row.key, null).catch(() => {});
        out.skipped += 1;
        out.details.push({ ref, target, outcome: "skipped", message: `Promotion already ${promo.status}.` });
        continue;
      }
      amount = promo.amount;
      pending = true;
    } else if (link.planShop && link.planId) {
      const waiting = (await store.getSetting(pendingPlanKey(link.planShop)).catch(() => null)) as
        | { amount?: number }
        | null;
      target = `shop:${link.planShop}`;
      if (!waiting) {
        await store.setSetting(row.key, null).catch(() => {});
        out.skipped += 1;
        out.details.push({ ref, target, outcome: "skipped", message: "No pending shop plan." });
        continue;
      }
      amount = waiting.amount;
      pending = true;
    } else if (link.planUser && link.planId) {
      const waiting = (await store.getSetting(pendingSellerPlanKey(link.planUser)).catch(() => null)) as
        | { amount?: string | number }
        | null;
      target = `user:${link.planUser}`;
      if (!waiting) {
        await store.setSetting(row.key, null).catch(() => {});
        out.skipped += 1;
        out.details.push({ ref, target, outcome: "skipped", message: "No pending seller plan." });
        continue;
      }
      amount = typeof waiting.amount === "number" ? waiting.amount : undefined;
      pending = true;
    }

    if (!pending) {
      out.skipped += 1;
      out.details.push({ ref, target, outcome: "skipped", message: "No linked target." });
      continue;
    }

    const q = await querySTKPush(ref);
    if (!q.ok) {
      out.pending += 1;
      out.details.push({
        ref,
        target,
        outcome: "pending",
        message: q.resultCode ? `${q.resultCode}: ${q.message}` : q.message,
      });
      continue;
    }

    const activated = await fulfilLinkedPurchase(
      { checkoutRequestId: ref, orderRef: ref, amount, providerRef: `QUERY-${ref}` },
      store
    ).catch(() => false);
    if (activated) {
      await store
        .setSetting(`mpesa_cb:QUERY-${ref}`, { at: new Date().toISOString(), target, amount })
        .catch(() => {});
      out.activated += 1;
      out.details.push({ ref, target, outcome: "activated" });
    } else {
      out.errors += 1;
      out.details.push({ ref, target, outcome: "error", message: "Activation failed (amount/link mismatch)." });
    }
  }

  return out;
}
