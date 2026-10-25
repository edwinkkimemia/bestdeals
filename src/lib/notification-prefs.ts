/** Shared notification preference types/constants (client + server safe). */

export const NOTIFICATION_PREF_TYPES = [
  "message",
  "order",
  "listing",
  "verification",
  "alert",
  "promotion",
  "system",
] as const;

export type NotificationPrefType = (typeof NOTIFICATION_PREF_TYPES)[number];
export type NotificationPrefs = Record<NotificationPrefType, boolean>;

export const NOTIFICATION_PREF_META: Record<
  NotificationPrefType,
  { label: string; description: string }
> = {
  message: { label: "Messages", description: "New buyer/seller chat messages." },
  order: { label: "Orders", description: "Order status, payment and delivery updates." },
  listing: { label: "Listings & moderation", description: "Approvals, rejections and listing updates." },
  verification: { label: "Verification", description: "Seller/ID verification decisions." },
  alert: { label: "Saved search alerts", description: "New matching ads and price drops from saved searches." },
  promotion: { label: "Promotions & boosts", description: "Boost receipts and promotional updates." },
  system: { label: "Account updates", description: "Important account and platform notices." },
};

/** High-signal events are on by default; marketing-style boosts stay opt-in. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  message: true,
  order: true,
  listing: true,
  verification: true,
  alert: true,
  promotion: false,
  system: true,
};

export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_NOTIFICATION_PREFS };
  for (const type of NOTIFICATION_PREF_TYPES) {
    if (typeof source[type] === "boolean") out[type] = source[type];
  }
  return out;
}
