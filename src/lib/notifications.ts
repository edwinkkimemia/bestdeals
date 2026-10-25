/**
 * In-app notification centre (Jiji-style).
 *
 * Storage reuses the existing `Notification` table / DemoStore memory with:
 *   channel  = "inapp"
 *   template = notification type (message | listing | order | verification | promotion | alert | system)
 *   payload  = { title, body, link? }
 *   sentAt   = read timestamp (null = unread) — avoids a schema migration.
 *   createdAt = delivery time
 *
 * Out-of-band email/SMS stays in `lib/notify.ts`; this module is the bell
 * icon + /dashboard/notifications feed.
 */

import { getStore } from "./store";

export type NotificationType =
  | "message"
  | "listing"
  | "order"
  | "verification"
  | "promotion"
  | "alert"
  | "system";

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
};

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  message: "Messages",
  listing: "Listings",
  order: "Orders",
  verification: "Verification",
  promotion: "Promotions",
  alert: "Search alerts",
  system: "Updates",
};

export function isNotificationType(v: string): v is NotificationType {
  return (["message", "listing", "order", "verification", "promotion", "alert", "system"] as string[]).includes(v);
}

/** Best-effort in-app notify — never throws into checkout/chat/moderation flows. */
export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}): Promise<AppNotification | null> {
  try {
    if (!input.userId) return null;
    const store = getStore();
    // Store interface carries the centre methods (see store.ts).
    const fn = (store as unknown as {
      createNotification?: (d: typeof input) => Promise<AppNotification>;
    }).createNotification;
    if (typeof fn !== "function") return null;
    const title = input.title.trim().slice(0, 120) || "Notification";
    const body = input.body.trim().slice(0, 500) || title;
    const created = await fn.call(store, {
      userId: input.userId,
      type: input.type,
      title,
      body,
      link: input.link?.slice(0, 500),
    });
    if (created) {
      try {
        const { pushEnabledFor } = await import("./notification-preferences");
        if (await pushEnabledFor(input.userId, input.type)) {
          const { sendPushToUser } = await import("./push");
          await sendPushToUser(input.userId, {
            title,
            body,
            url: input.link || "/dashboard/notifications",
            tag: created.id,
          });
        }
      } catch {}
    }
    return created;
  } catch {
    return null;
  }
}
