"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BOOST_PRODUCTS } from "@/data/catalog";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Listing = { id: string; title: string; price: number; status: string; images: number };
type Promo = { id: string; listingId: string; kind: string; days: number; amount: number; status: string; endsAt: string };

/** Buy Featured boosts (wallet / M-Pesa) and track receipts — replaces the eligibility-only list. */
export function PromotePanel({ listings, phone: defaultPhone, isAdmin, focusListingId }: { listings: Listing[]; phone: string; isAdmin: boolean; focusListingId?: string }) {
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [product, setProduct] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState(defaultPhone);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState<string | null>(null);

  const load = async () => {
    const r = await fetch("/api/promotions");
    if (r.ok) setPromos(((await r.json()).items ?? []) as Promo[]);
  };
  useEffect(() => {
    load();
  }, []);

  // The Daraja callback activates the boost server-side. Poll until this
  // listing's promotion goes live so the buyer sees the result immediately.
  useEffect(() => {
    if (!awaiting) return;
    const listingId = awaiting;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      try {
        const r = await fetch("/api/promotions");
        if (r.ok) {
          const items = (((await r.json()) as { items?: Promo[] }).items ?? []) as Promo[];
          const live = items.find((p) => p.listingId === listingId && p.status === "active");
          if (live) {
            setAwaiting(null);
            setMsg((m) => ({ ...m, [listingId]: "Payment confirmed — your boost is live 🚀" }));
            await load();
            router.refresh();
            return;
          }
        }
      } catch {}
      if (tries >= 45) {
        setAwaiting(null);
        setMsg((m) => ({ ...m, [listingId]: "Still waiting for M-Pesa. Refresh once you receive the confirmation SMS." }));
      }
    }, 4000);
    return () => clearInterval(t);
  }, [awaiting, router]);
  useEffect(() => {
    if (focusListingId) {
      document.getElementById("promote-focus")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusListingId]);

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
      const processing = j.payment?.status === "processing";
      setAwaiting(processing ? listingId : null);
      await load();
      if (!processing) router.refresh();
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
  const ordered = [...listings].sort((a, b) => Number(b.id === focusListingId) - Number(a.id === focusListingId));
  const focused = ordered.find((l) => l.id === focusListingId);

  return (
    <div>
      {focused && (
        <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-700" role="status">
          Promoting <strong>{focused.title}</strong> — pick a boost below. {focused.status !== "active" ? "It must finish moderation first; the boost unlocks once it is active." : ""}
        </p>
      )}
      <div className="mt-3 grid gap-2">
        <label className="text-sm font-medium" htmlFor="promo-phone">M-Pesa number for boost payments</label>
        <input id="promo-phone" className="input-bd max-w-xs" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" />
      </div>
      <ul className="mt-4 space-y-3">
        {ordered.map((l) => {
          const eligible = l.status === "active" && l.images > 0;
          const ps = promosFor(l.id);
          const active = ps.find((p) => p.status === "active");
          const isFocus = l.id === focusListingId;
          const waiting = awaiting === l.id;
          return (
            <li key={l.id} id={isFocus ? "promote-focus" : undefined} className={`card scroll-mt-32 p-4 text-sm ${isFocus ? "border-2 border-brand-600" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1"><strong>{l.title}</strong> <span className="text-ink-400">· {formatKES(l.price)}</span></span>
                <Badge tone={l.status === "active" ? "green" : l.status === "pending" ? "amber" : "neutral"}>{l.status}</Badge>
                {active ? <span className="chip !border-green-600 !text-green-700">Featured till {new Date(active.endsAt).toLocaleDateString()}</span>
                  : <span className="chip">{eligible ? "Eligible ✓" : l.status !== "active" ? "Needs approval" : "Add photos"}</span>}
              </div>
              {eligible && !active && (
                <div className="mt-3">
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`Boost option for ${l.title}`}>
                    {BOOST_PRODUCTS.map((b) => {
                      const selected = (product[l.id] ?? BOOST_PRODUCTS[0].id) === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setProduct((p) => ({ ...p, [l.id]: b.id }))}
                          className={`rounded-xl border p-3 text-left text-sm transition ${selected ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600/30" : "border-neutral-200 hover:border-brand-600"}`}
                        >
                          <span className="flex items-center justify-between gap-1 font-bold">
                            {b.name}
                            {b.id === "boost-30" && <Badge tone="green">Best value</Badge>}
                          </span>
                          <span className="mt-0.5 block font-extrabold">{formatKES(b.price)}</span>
                          <span className="mt-0.5 block text-xs text-ink-500">{b.blurb}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button className="btn-primary mt-2 w-full !py-2 text-sm sm:w-auto sm:!px-6" disabled={busy === l.id || waiting} onClick={() => buy(l.id)}>
                    {busy === l.id ? "Processing…" : waiting ? "Waiting for M-Pesa…" : `Boost for ${formatKES((BOOST_PRODUCTS.find((b) => b.id === (product[l.id] ?? BOOST_PRODUCTS[0].id)) ?? BOOST_PRODUCTS[0]).price)}`}
                  </button>
                  <p className="mt-1 text-xs text-ink-400">Wallet balance pays instantly — otherwise an M-Pesa prompt goes to the number above. This page updates automatically after payment.</p>
                </div>
              )}
              {msg[l.id] && <p role="status" className="mt-2 rounded-lg bg-sand-50 p-2">{msg[l.id]}</p>}
              {ps.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-500">
                  {ps.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-2">
                      <span>{p.kind} · {p.days}d · {formatKES(p.amount)} · <strong>{p.status}</strong></span>
                      <a
                        href={`/api/invoices/${encodeURIComponent(`promo:${p.id}`)}/pdf`}
                        className="link-bd"
                        aria-label={`Download invoice for this ${p.kind} boost`}
                      >
                        Invoice PDF
                      </a>
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
        Boosts are labelled Featured and never override moderation. Pay per boost from wallet balance or M-Pesa STK — no plan needed.
        Cancel anytime; refunds follow the Returns policy.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/pricing" className="link-bd">See shop plans →</Link>
        {" · "}
        <Link href="/dashboard/invoices" className="link-bd">Invoices &amp; receipts →</Link>
      </p>
    </div>
  );
}
