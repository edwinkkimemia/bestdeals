"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  BellRing,
  Megaphone,
  MessageCircle,
  Package,
  ShoppingCart,
} from "lucide-react";
import { timeAgo } from "@/lib/format";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
};

function TypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0";
  if (type === "message") return <MessageCircle className={cls} />;
  if (type === "listing") return <Package className={cls} />;
  if (type === "order") return <ShoppingCart className={cls} />;
  if (type === "verification") return <BadgeCheck className={cls} />;
  if (type === "promotion") return <Megaphone className={cls} />;
  if (type === "alert") return <BellRing className={cls} />;
  return <Bell className={cls} />;
}

/**
 * Jiji-style bell: unread badge + dropdown preview, deep-links to the
 * full /dashboard/notifications feed.
 */
export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.items ?? []);
      setUnread(j.unread ?? 0);
    } catch {}
  }, []);

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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const markAll = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
    } catch {}
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnread(0);
    window.dispatchEvent(new Event("bd:notifications"));
  };

  const openItem = async (n: Item) => {
    setOpen(false);
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
    router.push(n.link || "/dashboard/notifications");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-lg p-2 hover:bg-sand-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
            <p className="text-sm font-bold">Notifications{unread > 0 ? ` (${unread})` : ""}</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="link-bd text-xs">
                Mark all as read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-2 text-sm font-bold">You&apos;re all caught up</p>
              <p className="mt-1 text-xs text-ink-500">Messages, listing reviews and order updates land here.</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-sand-50"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        n.readAt ? "bg-sand-100 text-ink-400" : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      <TypeIcon type={n.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-1.5">
                        <span className={`flex-1 truncate text-sm ${n.readAt ? "font-medium" : "font-bold"}`}>
                          {n.title}
                        </span>
                        {!n.readAt && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                      </span>
                      <span className="block truncate text-xs text-ink-500">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-400">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-neutral-100 bg-sand-50/60 px-4 py-2.5 text-center text-sm font-bold text-brand-700 hover:bg-sand-100"
          >
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
