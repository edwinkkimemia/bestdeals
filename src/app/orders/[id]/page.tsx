"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatKES } from "@/lib/format";
import { PushEnablePrompt } from "@/components/push-enable-prompt";

type Order = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  phone: string;
  name?: string;
  createdAt: string;
  items: { title: string; qty: number; price: number }[];
  suborders?: { seller: string }[];
};

type Dispute = {
  id: string;
  reason: string;
  details?: string;
  status: string;
  response?: string;
};

const REASONS = [
  ["not_received", "Item not received"],
  ["not_as_described", "Not as described"],
  ["damaged", "Damaged on arrival"],
  ["wrong_item", "Wrong item sent"],
  ["payment_issue", "Payment issue"],
  ["other", "Other"],
] as const;

export default function OrderDetail({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="container-bd py-12 text-sm">Loading order…</div>}>
      <OrderInner id={params.id} />
    </Suspense>
  );
}

function OrderInner({ id }: { id: string }) {
  const sp = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [dForm, setDForm] = useState({ reason: "not_received", details: "", name: "", phone: "" });
  const [dMsg, setDMsg] = useState("");
  const [rForm, setRForm] = useState({ name: "", rating: 5, body: "" });
  const [rMsg, setRMsg] = useState("");
  const [existingReview, setExistingReview] = useState<{ status: string } | null>(null);

  const phone = sp.get("phone") || (typeof window !== "undefined" ? localStorage.getItem("bd_phone") || "" : "");

  useEffect(() => {
    // Instant local snapshot, then server refresh (source of truth).
    try {
      const all: Order[] = JSON.parse(localStorage.getItem("bd_orders_v1") || "[]");
      const local = all.find((o) => o.id === id) ?? null;
      if (local) {
        setOrder(local);
        setDForm((f) => ({ ...f, name: "", phone: local.phone }));
      }
    } catch {}
    (async () => {
      try {
        const r = await fetch(`/api/orders/${id}?phone=${encodeURIComponent(phone)}`);
        if (r.ok) {
          const j = await r.json();
          setOrder(j.order);
          setDForm((f) => ({ ...f, phone: j.order.phone }));
        }
      } catch {}
      try {
        const r = await fetch(`/api/disputes?order=${id}`);
        if (r.ok) setDispute((await r.json()).dispute);
      } catch {}
      try {
        const r = await fetch(`/api/reviews?order=${id}`);
        if (r.ok) {
          const j = await r.json();
          if (j.review) setExistingReview(j.review);
        }
      } catch {}
    })();
  }, [id, phone]);

  if (!order) {
    return (
      <div className="container-bd py-12">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <p className="font-bold">Order not found</p>
          <p className="mt-1 text-sm text-ink-500">Open this page from checkout, or look up with your checkout phone.</p>
          <Link href="/orders" className="btn-primary mt-4">My orders</Link>
        </div>
      </div>
    );
  }

  const steps = ["pending", "confirmed", "packed", "shipped", "delivered"];
  const idx = Math.max(0, steps.indexOf(order.status));
  const seller = order.suborders?.[0]?.seller;

  return (
    <div className="container-bd max-w-2xl py-8">
      <Link href="/orders" className="link-bd text-sm">← All orders</Link>
      <h1 className="section-title mt-2">Order {order.id}</h1>
      <div className="card mt-4 space-y-3 p-5">
        <div className="flex justify-between text-sm"><span>Status</span><strong>{order.status} · {order.paymentStatus}</strong></div>
        <div className="flex justify-between text-sm"><span>Total ({order.paymentMethod})</span><strong>{formatKES(order.total)}</strong></div>
        <ol className="flex gap-1" aria-label="Order progress">
          {steps.map((s, i) => (
            <li key={s} className={`h-2 flex-1 rounded-full ${i <= idx ? "bg-brand-600" : "bg-neutral-200"}`} title={s} />
          ))}
        </ol>
        <ul className="text-sm">{order.items.map((it, k) => <li key={k}>· {it.title} × {it.qty} — {formatKES(it.price * it.qty)}</li>)}</ul>
        {order.paymentStatus !== "paid" && (
          <div className="rounded-xl bg-sand-50 p-3 text-sm">
            <p className="font-semibold">Cash on delivery</p>
            <p className="text-ink-500">Pay the courier in cash when your order arrives. Never send money in advance — Chap staff will never ask for your PIN.</p>
          </div>
        )}
        <p className="text-xs text-ink-400">Payment status changes only via verified server callbacks — never from browser state.</p>
      </div>

      <PushEnablePrompt context="orders" className="mt-3" />

      {/* Dispute */}
      <div className="card mt-3 p-5">
        <h2 className="font-bold">Problem with this order?</h2>
        {dispute ? (
          <div className="mt-2 space-y-1 text-sm">
            <p><strong>{dispute.reason}</strong> · <span className="chip">{dispute.status.replace(/_/g, " ")}</span></p>
            {dispute.details && <p className="text-ink-700">{dispute.details}</p>}
            {dispute.response ? (
              <p className="rounded-xl bg-sand-50 p-3"><strong>Seller response:</strong> {dispute.response}</p>
            ) : (
              <p className="text-ink-500">Waiting for the seller&apos;s response. An admin steps in if unresolved.</p>
            )}
          </div>
        ) : (
          <form
            className="mt-2 grid gap-2 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setDMsg("");
              const r = await fetch("/api/disputes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: id, ...dForm }),
              });
              const j = await r.json();
              if (!r.ok) return setDMsg(j.error || "Failed.");
              setDMsg("Dispute opened ✓ — the seller has been notified.");
              const g = await fetch(`/api/disputes?order=${id}`);
              if (g.ok) setDispute((await g.json()).dispute);
            }}
          >
            <select aria-label="Reason" className="input-bd" value={dForm.reason} onChange={(e) => setDForm({ ...dForm, reason: e.target.value })}>
              {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input aria-label="Your name" placeholder="Your name" className="input-bd" value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} required />
            <input aria-label="Checkout phone" placeholder="Checkout phone" className="input-bd sm:col-span-2" value={dForm.phone} onChange={(e) => setDForm({ ...dForm, phone: e.target.value })} required />
            <textarea aria-label="Details" placeholder="What went wrong?" rows={3} className="input-bd sm:col-span-2" value={dForm.details} onChange={(e) => setDForm({ ...dForm, details: e.target.value })} />
            <button className="btn-secondary sm:col-span-2">Open dispute</button>
            {dMsg && <p role="status" className="text-sm sm:col-span-2">{dMsg}</p>}
          </form>
        )}
      </div>

      {/* Review */}
      <div className="card mt-3 p-5">
        <h2 className="font-bold">Rate this purchase{seller ? ` from ${seller}` : ""}</h2>
        <p className="text-xs text-ink-400">Paid or delivered orders earn a ✓ Verified purchase badge. All reviews are moderated before display.</p>
        {existingReview ? (
          <p role="status" className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            Review submitted ✓ — {existingReview.status === "approved" ? "it's live on the seller's page." : "it's queued for moderation."} One review per order.
          </p>
        ) : (
        <form
          className="mt-2 grid gap-2 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setRMsg("");
            const r = await fetch("/api/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: id, sellerName: seller, authorName: rForm.name, rating: rForm.rating, body: rForm.body }),
            });
            const j = await r.json();
            if (r.ok) {
              setExistingReview({ status: "pending" });
            } else {
              setRMsg(j.error || "Failed.");
            }
          }}
        >
          <input aria-label="Your name" placeholder="Your name" className="input-bd" value={rForm.name} onChange={(e) => setRForm({ ...rForm, name: e.target.value })} required />
          <select aria-label="Rating" className="input-bd" value={rForm.rating} onChange={(e) => setRForm({ ...rForm, rating: Number(e.target.value) })}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
          </select>
          <textarea aria-label="Review" placeholder="How was the item and seller?" rows={3} className="input-bd sm:col-span-2" value={rForm.body} onChange={(e) => setRForm({ ...rForm, body: e.target.value })} />
          <button className="btn-primary sm:col-span-2">Submit review</button>
          {rMsg && <p role="status" className="text-sm sm:col-span-2">{rMsg}</p>}
        </form>
        )}
      </div>
    </div>
  );
}
