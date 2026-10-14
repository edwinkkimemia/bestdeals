import { getStore } from "./store";

/**
 * Stock reservations: checkout decrements up front, and every path that kills
 * the order (buyer/seller/admin cancel, failed M-Pesa) must give the units
 * back — otherwise unpaid orders permanently burn inventory. Reservations are
 * recorded per order so restores are exact and idempotent (the key is deleted
 * after the first restore).
 */

export type ReservedLine = { storeId: string; qty: number };

const keyFor = (orderId: string) => `order_stock:${orderId}`;

/** Record what a successful checkout decremented (called after all decrements land). */
export async function recordReservation(orderId: string, lines: ReservedLine[]): Promise<void> {
  if (lines.length === 0) return;
  await getStore()
    .setSetting(keyFor(orderId), lines)
    .catch(() => {});
}

/** Give reserved units back. No-op when nothing was reserved or already restored. */
export async function restoreReservedStock(orderId: string): Promise<void> {
  const store = getStore();
  const key = keyFor(orderId);
  const lines = (await store.getSetting(key).catch(() => null)) as ReservedLine[] | null;
  if (!lines || lines.length === 0) return;
  for (const l of lines) {
    if (!l?.storeId || !(l.qty > 0)) continue;
    try {
      const cur = await store.getListing(l.storeId);
      if (cur) await store.updateListing(l.storeId, { stock: cur.stock + l.qty });
    } catch {}
  }
  await store.deleteSetting(key).catch(() => {});
}
