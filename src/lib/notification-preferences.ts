/** Per-user notification preferences stored as one settings row. */
import { getStore, storeRead, type Store } from "./store";
import {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  type NotificationPrefs,
  type NotificationPrefType,
} from "./notification-prefs";

const key = (userId: string) => `notification_prefs:${userId}`;

export async function getNotificationPrefs(
  userId: string,
  storeOverride?: Store
): Promise<NotificationPrefs> {
  if (!userId) return { ...DEFAULT_NOTIFICATION_PREFS };
  const store = storeOverride ?? getStore();
  const raw = await storeRead(() => store.getSetting(key(userId)), null);
  return normalizeNotificationPrefs(raw);
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: Partial<Record<NotificationPrefType, boolean>>
): Promise<NotificationPrefs> {
  const current = await getNotificationPrefs(userId);
  const next = normalizeNotificationPrefs({ ...current, ...prefs });
  await getStore().setSetting(key(userId), next);
  return next;
}

/** Push is opt-out per type; in-app notifications are always kept. */
export async function pushEnabledFor(
  userId: string,
  type: NotificationPrefType,
  storeOverride?: Store
): Promise<boolean> {
  const prefs = await getNotificationPrefs(userId, storeOverride);
  return prefs[type] !== false;
}
