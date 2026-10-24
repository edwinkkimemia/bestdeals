"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  BellOff,
  BellRing,
  Megaphone,
  MessageCircle,
  Package,
  ShoppingCart,
} from "lucide-react";
import { timeAgo } from "@/lib/format";
import { dedupeNotifications } from "@/lib/notification-dedupe";
import { PushNotificationsCard } from "@/components/push-notifications-card";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "message", label: "Messages" },
  { value: "listing", label: "Listings" },
  { value: "order", label: "Orders" },
  { value: "verification", label: "Verification" },
  { value: "promotion", label: "Promotions" },
  { value: "alert", label: "Search alerts" },
  { value: "system", label: "Updates" },
];

function TypeIcon({ type, read }: { type: string; read: boolean }) {
  const cls = "h-5 w-5";
  if (type === "message") return <MessageCircle className={cls} />;
  if (type === "listing") return <Package className={cls} />;
  if (type === "order") return <ShoppingCart className={cls} />;
  if (type === "verification") return <BadgeCheck className={cls} />;
  if (type === "promotion") return <Megaphone className={cls} />;
  if (type === "alert") return <BellRing className={cls} />;
  if (type === "system") return <Bell className={cls} />;
  return <Bell className={cls} />;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ limit: "50" });
      if (tab === "unread") p.set("unread", "1");
      if (type) p.set("type", type);
      const r = await fetch(`/api/notifications?${p.toString()}`, { cache: "no-store" });
      if (r.status === 401) {
        router.push("/auth/signin?next=/dashboard/notifications");
        return;
      }
      if (r.ok) {
        const j = await r.json();
        setItems(j.items ?? []);
        setUnread(j.unread ?? 0);
      }
    } catch {}
    setReady(true);
  }, [router, tab, type]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("bd:notifications", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bd:notifications", onFocus);
    };
  }, [load]);

  const markAll = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnread(0);
      window.dispatchEvent(new Event("bd:notifications"));
    } catch {}
    setBusy(false);
  };

  const openItem = async (n: Item) => {
    if (!n.readAt) {
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "read", id: n.id }),
        });
      } catch {}
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      window.dispatchEvent(new Event("bd:notifications"));
    }
    if (n.link) router.push(n.link);
  };

  const shown = useMemo(() => dedupeNotifications(items), [items]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand-600" /> Notifications
            {unread > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-500 px-2 text-xs font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Messages, listing reviews, orders, verification, boosts and search alerts — newest first.{" "}
            <Link href="/dashboard/saved-searches" className="link-bd">Manage alerts →</Link>
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} disabled={busy} className="btn-secondary !py-2 text-sm disabled:opacity-60">
            {busy ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      <PushNotificationsCard />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ring-neutral-200",
              tab === t ? "bg-ink-900 text-white ring-ink-900" : "bg-white text-ink-700 hover:bg-sand-100"
            )}
          >
            {t === "all" ? "All" : `Unread${unread > 0 ? ` (${unread})` : ""}`}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
        {FILTERS.map((f) => (
          <button
            key={f.value || "all-types"}
            onClick={() => setType(f.value)}
            aria-pressed={type === f.value}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold ring-1",
              type === f.value
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-ink-500 ring-neutral-200 hover:text-brand-700 hover:ring-brand-600"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="mt-6 text-sm text-ink-500">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <BellOff className="mx-auto h-10 w-10 text-brand-600" />
          <p className="mt-2 font-bold">{tab === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            {tab === "unread"
              ? "You’re all caught up. New chats, approvals and order updates will appear here."
              : "Chat with a seller, post a listing or place an order — updates land here like on Jiji."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/classifieds" className="btn-primary">Browse classifieds</Link>
            <Link href="/dashboard/messages" className="btn-secondary">Open messages</Link>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map((n) => {
            const read = !!n.readAt;
            return (
              <li key={n.id}>
                <button
                  onClick={() => openItem(n)}
                  className={cn(
                    "card flex w-full items-start gap-3 p-4 text-left hover:border-brand-600",
                    !read && "border-brand-600/40 bg-brand-50/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                      read ? "bg-sand-100 text-ink-400" : "bg-brand-600 text-white"
                    )}
                  >
                    <TypeIcon type={n.type} read={read} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <strong className={cn("flex-1 text-sm", read ? "font-semibold" : "font-bold")}>{n.title}</strong>
                      {!read && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-700">{n.body}</span>
                    <span className="mt-1 block text-xs text-ink-400">
                      {timeAgo(n.createdAt)}
                      {n.link ? " · Tap to view →" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
