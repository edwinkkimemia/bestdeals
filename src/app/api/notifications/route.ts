import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { isNotificationType } from "@/lib/notifications";
import { dedupeNotifications } from "@/lib/notification-dedupe";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Jiji-style notification centre feed.
 * GET returns the signed-in user's latest in-app notifications + unread count.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
  const typeFilter = url.searchParams.get("type") ?? "";
  const store = getStore();
  try {
    // De-dupe before counting so a repeated approval doesn't inflate the bell.
    const all = dedupeNotifications(await store.listNotifications(user.id, { limit: 100 }));
    const unread = all.filter((n) => !n.readAt).length;
    let items = unreadOnly ? all.filter((n) => !n.readAt) : all;
    if (typeFilter && isNotificationType(typeFilter)) items = items.filter((n) => n.type === typeFilter);
    items = items.slice(0, limit);
    return NextResponse.json({ items, unread });
  } catch {
    return NextResponse.json({ items: [], unread: 0 });
  }
}

/** Mark one or all as read (participant only — users touch their own rows). */
export async function PATCH(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `notif:${user.id}`), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const action = String((body as { action?: unknown }).action ?? "");
  const store = getStore();
  if (action === "read-all") {
    const marked = await store.markAllNotificationsRead(user.id).catch(() => 0);
    return NextResponse.json({ ok: true, marked });
  }
  if (action === "read") {
    const id = String((body as { id?: unknown }).id ?? "");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await store.markNotificationRead(id, user.id).catch(() => null);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
