/**
 * Notification feed de-duplication.
 *
 * Listing updates can repeat when an admin double-clicks approve or a bulk
 * action includes the same row twice. Those repeats are never useful, so we
 * collapse identical listing notifications regardless of age. Other types
 * (e.g. two identical chat messages) are only collapsed inside a short burst.
 */
export type NotificationLike = {
  type: string;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
};

const BURST_MS = 5 * 60_000;

export function dedupeNotifications<T extends NotificationLike>(items: T[]): T[] {
  const seenAt = new Map<string, number>();
  return items.filter((n) => {
    const key = `${n.type}|${n.title}|${n.body}|${n.link ?? ""}`;
    const at = new Date(n.createdAt).getTime();
    const prev = seenAt.get(key);
    if (prev !== undefined && (n.type === "listing" || prev - at < BURST_MS)) return false;
    seenAt.set(key, at);
    return true;
  });
}
