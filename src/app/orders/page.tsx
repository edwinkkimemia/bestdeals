"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatKES } from "@/lib/format";

type Order = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  phone?: string;
  createdAt: string;
  items: { title: string; qty: number; price: number }[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    const savedPhone = (() => {
      try {
        return localStorage.getItem("bd_phone") || "";
      } catch {
        return "";
      }
    })();
    setLookup(savedPhone);
    (async () => {
      const merged = new Map<string, Order>();
      try {
        const local: Order[] = JSON.parse(localStorage.getItem("bd_orders_v1") || "[]");
        local.forEach((o) => merged.set(o.id, o));
      } catch {}
      if (savedPhone) {
        try {
          const r = await fetch(`/api/orders?phone=${encodeURIComponent(savedPhone)}`);
          if (r.ok) {
            const j = await r.json();
            (j.items as Order[]).forEach((o) => merged.set(o.id, o));
          }
        } catch {}
      } else {
        try {
          const r = await fetch(`/api/orders`);
          if (r.ok) {
            const j = await r.json();
            (j.items as Order[]).forEach((o) => merged.set(o.id, o));
          }
        } catch {}
      }
      setOrders([...merged.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      setReady(true);
    })();
  }, []);

  const doLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setReady(false);
    try {
      localStorage.setItem("bd_phone", phone);
    } catch {}
    try {
      const r = await fetch(`/api/orders?phone=${encodeURIComponent(phone)}`);
      if (r.ok) {
        const j = await r.json();
        setOrders((j.items as Order[]).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      }
    } catch {}
    setReady(true);
  };

  return (
    <div className="container-bd py-8">
      <h1 className="section-title">My orders</h1>
      <form onSubmit={doLookup} className="card mt-4 flex flex-col gap-2 p-4 sm:flex-row">
        <input
          aria-label="Checkout phone for order lookup"
          placeholder="Look up by checkout phone, e.g. 0712345678"
          className="input-bd flex-1"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="btn-secondary shrink-0">Find my orders</button>
      </form>
      {!ready ? (
        <p className="mt-4 text-sm text-ink-500">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-bold">No orders yet</p>
          <p className="text-sm text-ink-500">Orders you place appear here with live status. Signed in? Your linked orders show automatically.</p>
          <Link href="/shop" className="btn-primary mt-4">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{o.id} · {formatKES(o.total)}</p>
                <span className="chip">{o.status} · {o.paymentStatus}</span>
              </div>
              <p className="text-xs text-ink-400">{new Date(o.createdAt).toLocaleString("en-KE")} · {o.paymentMethod}</p>
              <ul className="mt-2 text-sm">{o.items.map((i, k) => <li key={k}>· {i.title} × {i.qty}</li>)}</ul>
              <Link href={`/orders/${o.id}${lookup ? `?phone=${encodeURIComponent(lookup)}` : o.phone ? `?phone=${encodeURIComponent(o.phone)}` : ""}`} className="link-bd mt-2 inline-block text-sm">Track order →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
