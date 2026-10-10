"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Msg = { id: string; listing: string; message: string; at: string };

export default function MessagesPage() {
  const [items, setItems] = useState<Msg[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("bd_messages_v1") || "[]"));
    } catch {}
  }, []);
  return (
    <div className="container-bd max-w-2xl py-8">
      <h1 className="section-title">Enquiries & messages</h1>
      {items.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">No conversations yet</p>
          <p className="text-sm text-ink-500">Enquiries you send or receive appear here with unread counts in production.</p>
          <Link href="/classifieds" className="btn-primary mt-4">Browse classifieds</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((m) => (
            <li key={m.id} className="card p-4">
              <p className="text-sm font-bold">{m.listing}</p>
              <p className="text-sm text-ink-700">{m.message}</p>
              <p className="text-xs text-ink-400">{new Date(m.at).toLocaleString("en-KE")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
