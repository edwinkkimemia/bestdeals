"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BOOST_PRODUCTS } from "@/data/catalog";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Listing = { id: string; title: string; price: number; status: string; images: number };
type Promo = { id: string; listingId: string; kind: string; days: number; amount: number; status: string; endsAt: string };

/** Buy Featured boosts (M-Pesa) and track receipts — replaces the eligibility-only list. */
export function PromotePanel({ listings, phone: defaultPhone, isAdmin }: { listings: Listing[]; phone: string; isAdmin: boolean }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [product, setProduct] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState(defaultPhone);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const r = await fetch("/api/promotions");
    if (r.ok) setPromos(((await r.json()).items ?? []) as Promo[]);
  };
  useEffect(() => {
    load();
  }, []);

  const buy = async (listingId: string) => {
    setMsg((m) => ({ ...m, [listingId]: "" }));
    setBusy(listingId);
    try {
      const r = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, productId: product[listingId] ?? BOOST_PRODUCTS[0].id, phone: phone || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg((m) => ({ ...m, [listingId]: j.error || "Purchase failed." }));
      setMsg((m) => ({ ...m, [listingId]: j.summary || "Boost reserved — complete M-Pesa payment." }));
      load();
    } finally {
      setBusy(null);
    }
  };

  const act = async (promoId: string, action: string) => {
    setBusy(promoId);
    try {
      const r = await fetch(`/api/promotions/${promoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg((m) => ({ ...m, [promoId]: j.error || "Action failed." }));
      load();
    } finally {
      setBusy(null);
    }
  };

  const promosFor = (listingId: string) => promos.filter((p) => p.listingId === listingId);

  return (
    <div>
      <div className="mt-3 grid gap-2">
        <label className="text-sm font-medium" htmlFor="promo-phone">M-Pesa number for boost payments</label>
        <input id="promo-phone" className="input-bd max-w-xs" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" />
      </div>
      <ul className="mt-4 space-y-3">
        {listings.map((l) => {
          const eligible = l.status === "active" && l.images > 0;
          const ps = promosFor(l.id);
          const active = ps.find((p) => p.status === "active");
          return (
            <li key={l.id} className="card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1"><strong>{l.title}</strong> <span className="text-ink-400">· {formatKES(l.price)}</span></span>
                <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : "neutral"}>{l.status}</Badge>
                {active ? <span className="chip !border-green-600 !text-green-700">Featured till {new Date(active.endsAt).toLocaleDateString()}</span>
                  : <span className="chip">{eligible ? "Eligible ✓" : l.status !== "active" ? "Needs approval" : "Add photos"}</span>}
              </div>
              {eligible && !active && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Boost product for ${l.title}`}
                    className="input-bd max-w-xs"
                    value={product[l.id] ?? BOOST_PRODUCTS[0].id}
                    onChange={(e) => setProduct((p) => ({ ...p, [l.id]: e.target.value }))}
                  >
                    {BOOST_PRODUCTS.map((b) => <option key={b.id} value={b.id}>{b.name} — {formatKES(b.price)}</option>)}
                  </select>
                  <button className="btn-primary !px-4 !py-2 text-sm" disabled={busy === l.id} onClick={() => buy(l.id)}>
                    {busy === l.id ? "Processing…" : "Boost with M-Pesa"}
                  </button>
                </div>
              )}
              {msg[l.id] && <p role="status" className="mt-2 rounded-lg bg-sand-50 p-2">{msg[l.id]}</p>}
              {ps.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-500">
                  {ps.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-2">
                      <span>{p.kind} · {p.days}d · {formatKES(p.amount)} · <strong>{p.status}</strong></span>
                      {(p.status === "pending_payment" || p.status === "active") && (
                        <button className="link-bd" disabled={busy === p.id} onClick={() => act(p.id, "cancel")}>Cancel</button>
                      )}
                      {isAdmin && p.status === "pending_payment" && (
                        <button className="link-bd" disabled={busy === p.id} onClick={() => act(p.id, "activate")}>Confirm payment</button>
                      )}
                      {msg[p.id] && <span>{msg[p.id]}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-400">
        Boosts are labelled Featured and never override moderation. Payment via M-Pesa STK push
        {!process.env.NEXT_PUBLIC_MPESA ? " (demo mode: configure MPESA_* to go live — orders reserve as pending)" : ""}.
        Cancel anytime; refunds follow the Returns policy.
      </p>
      <p className="mt-2 text-sm"><Link href="/pricing" className="link-bd">See shop plans →</Link></p>
    </div>
  );
}
