"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircleOff, Search } from "lucide-react";
import { timeAgo } from "@/lib/format";

function ChatList({ items, filter, setFilter }: {
  items: Convo[];
  filter: string;
  setFilter: (v: string) => void;
}) {
  const q = filter.trim().toLowerCase();
  const shown = q
    ? items.filter((c) =>
        [c.listingTitle, c.sellerName, c.lastMessage].some((s) => (s ?? "").toLowerCase().includes(q))
      )
    : items;
  return (
    <>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          aria-label="Search chats"
          placeholder="Search chats…"
          className="input-bd !rounded-full !pl-9"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 text-center text-sm text-ink-500">No chats match “{filter.trim()}”.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/messages/${c.id}`} className="card flex items-center gap-3 p-4 hover:border-brand-600">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-black text-brand-700">
                  {(c.sellerName ?? "C").charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <strong className="truncate text-sm">{c.listingTitle ?? "General enquiry"}</strong>
                    {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">{c.unread > 99 ? "99+" : c.unread}</span>}
                  </span>
                  <span className="block truncate text-sm text-ink-500">{c.lastMessage ?? "—"}</span>
                  <span className="text-xs text-ink-400">{c.sellerName} · {c.lastAt ? timeAgo(c.lastAt) : ""}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type Convo = {
  id: string;
  listingTitle?: string;
  sellerName?: string;
  lastMessage?: string;
  lastAt?: string;
  unread: number;
};

export default function InboxPage() {
  const [items, setItems] = useState<Convo[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const r = await fetch(`/api/conversations`);
    if (r.status === 401) {
      setReady(true);
      return;
    }
    if (r.ok) setItems((await r.json()).items ?? []);
    setReady(true);
  };

  useEffect(() => {
    load();
    // Poll so chats started by the other side appear without a manual refresh.
    const t = setInterval(() => load(), 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="section-title">Messages</h1>
      <p className="mt-1 text-sm text-ink-500">Buyer–seller chats with rich text. Abusive users can be blocked and reported.</p>

      {!ready ? (
        <p className="mt-4 text-sm text-ink-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <MessageCircleOff className="mx-auto h-10 w-10 text-brand-600" />
          <p className="mt-2 font-bold">No conversations yet</p>
          <p className="mt-1 text-sm text-ink-500">Open any listing and tap Message seller to start chatting.</p>
          <Link href="/classifieds" className="btn-primary mt-4">Browse classifieds</Link>
        </div>
      ) : (
        <ChatList items={items} filter={filter} setFilter={setFilter} />
      )}
    </div>
  );
}
