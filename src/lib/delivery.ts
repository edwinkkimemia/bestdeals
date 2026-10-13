/** Delivery fees: single source of truth (admin-overridable via settings).
 * Defaults match the old hardcoded values so existing orders are unaffected.
 */
import { getStore } from "./store";

export type DeliveryMethod = "standard" | "express" | "pickup";

export const DELIVERY_DEFAULTS: Record<DeliveryMethod, number> = {
  standard: 250,
  express: 500,
  pickup: 0,
};

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  standard: "Standard (2–4 days)",
  express: "Express (same/next day)",
  pickup: "Pickup (Free)",
};

/** Fee-payer logic (Jiji-style): seller-created deliveries are free to buyer. */
export function deliveryFee(method: DeliveryMethod, opts?: { sellerPays?: boolean }): number {
  if (opts?.sellerPays) return 0;
  return DELIVERY_DEFAULTS[method] ?? DELIVERY_DEFAULTS.standard;
}

export async function getDeliveryFees(): Promise<Record<DeliveryMethod, number>> {
  try {
    const raw = (await getStore().getSetting("delivery_fees").catch(() => null)) as Record<string, unknown> | null;
    if (!raw) return { ...DELIVERY_DEFAULTS };
    return {
      standard: Number(raw.standard ?? DELIVERY_DEFAULTS.standard) || 0,
      express: Number(raw.express ?? DELIVERY_DEFAULTS.express) || 0,
      pickup: 0,
    };
  } catch {
    return { ...DELIVERY_DEFAULTS };
  }
}

export async function setDeliveryFees(fees: { standard?: number; express?: number }): Promise<void> {
  const cur = await getDeliveryFees().catch(() => ({ ...DELIVERY_DEFAULTS }));
  await getStore().setSetting("delivery_fees", {
    standard: Math.max(0, Math.min(100000, Math.round(fees.standard ?? cur.standard))),
    express: Math.max(0, Math.min(100000, Math.round(fees.express ?? cur.express))),
  });
}
