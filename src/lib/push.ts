/**
 * Browser Web Push subscriptions + delivery.
 *
 * VAPID keys come from env when configured; otherwise one key pair is
 * generated and kept in the shared settings store so subscriptions stay
 * valid across deploys (Postgres) or for the life of the process (demo).
 * Subscriptions are settings rows (`push:sub:<userId>:<endpoint hash>`),
 * which avoids a schema migration and supports multiple devices per user.
 */
import { createHash } from "node:crypto";
import webpush from "web-push";
import { getStore, type Store } from "./store";

const VAPID_SETTING = "push:vapid";
const SUB_PREFIX = (userId: string) => `push:sub:${userId}:`;
const DEFAULT_SUBJECT = "mailto:support@chap.co.ke";

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

type StoredSubscription = PushSubscriptionInput & {
  userAgent?: string;
  createdAt?: string;
};

type VapidKeys = { publicKey: string; privateKey: string };

let cachedVapid: VapidKeys | null = null;

function envVapid(): VapidKeys | null {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  return publicKey && privateKey ? { publicKey, privateKey } : null;
}

export async function getVapidKeys(storeOverride?: Store): Promise<VapidKeys> {
  const env = envVapid();
  if (env) {
    cachedVapid = env;
    return env;
  }
  if (cachedVapid) return cachedVapid;

  const store = storeOverride ?? getStore();
  const saved = (await store.getSetting(VAPID_SETTING).catch(() => null)) as VapidKeys | null;
  if (saved?.publicKey && saved.privateKey) {
    cachedVapid = saved;
    return saved;
  }

  const generated = webpush.generateVAPIDKeys();
  await store.setSetting(VAPID_SETTING, generated).catch(() => null);
  cachedVapid = generated;
  return generated;
}

export async function getPushPublicKey(storeOverride?: Store): Promise<string> {
  return (await getVapidKeys(storeOverride)).publicKey;
}

function subscriptionKey(userId: string, endpoint: string): string {
  const hash = createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
  return `${SUB_PREFIX(userId)}${hash}`;
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
  userAgent?: string | null,
  storeOverride?: Store
): Promise<void> {
  const store = storeOverride ?? getStore();
  const existing = await store.listSettings(SUB_PREFIX(userId)).catch(() => []);
  // Keep a handful of devices per account; the oldest registration drops out.
  if (existing.length >= 10) {
    const oldest = existing
      .map((row) => ({ row, at: (row.value as StoredSubscription | null)?.createdAt ?? "" }))
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(0, existing.length - 9);
    for (const { row } of oldest) await store.deleteSetting(row.key).catch(() => {});
  }
  await store.setSetting(subscriptionKey(userId, subscription.endpoint), {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: subscription.keys,
    userAgent: (userAgent ?? "").slice(0, 240),
    createdAt: new Date().toISOString(),
  } satisfies StoredSubscription);
}

export async function removePushSubscription(userId: string, endpoint?: string, storeOverride?: Store): Promise<number> {
  const store = storeOverride ?? getStore();
  if (endpoint) {
    await store.deleteSetting(subscriptionKey(userId, endpoint)).catch(() => null);
    return 1;
  }
  const rows = await store.listSettings(SUB_PREFIX(userId)).catch(() => []);
  for (const row of rows) await store.deleteSetting(row.key).catch(() => {});
  return rows.length;
}

export async function countPushSubscriptions(userId: string, storeOverride?: Store): Promise<number> {
  return (await (storeOverride ?? getStore()).listSettings(SUB_PREFIX(userId)).catch(() => [])).length;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Deliver a browser notification to every active device for one user.
 * Expired subscriptions are pruned automatically. Never throws into the
 * caller's business flow.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  storeOverride?: Store
): Promise<number> {
  if (!userId) return 0;
  const store = storeOverride ?? getStore();
  const rows = await store.listSettings(SUB_PREFIX(userId)).catch(() => []);
  if (rows.length === 0) return 0;

  const vapid = await getVapidKeys(store);
  webpush.setVapidDetails(
    (process.env.VAPID_SUBJECT || DEFAULT_SUBJECT).trim(),
    vapid.publicKey,
    vapid.privateKey
  );

  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 500),
    url: payload.url || "/dashboard/notifications",
    tag: payload.tag || undefined,
    icon: "/fav.png",
    badge: "/fav.png",
  });

  let sent = 0;
  await Promise.allSettled(
    rows.slice(0, 10).map(async (row) => {
      const sub = row.value as StoredSubscription | null;
      if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        await store.deleteSetting(row.key).catch(() => {});
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
          { TTL: 86400, urgency: "high", timeout: 3000 }
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await store.deleteSetting(row.key).catch(() => {});
        }
      }
    })
  );
  return sent;
}
