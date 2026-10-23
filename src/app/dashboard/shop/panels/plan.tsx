"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { formatKES } from "@/lib/format";
import type { PendingPlan } from "@/lib/plans";

type ShopOpt = { slug: string; name: string; planId: string };
type Invoice = {
  id: string;
  number?: string;
  kind?: "plan" | "promotion";
  description?: string;
  shopSlug?: string;
  planId?: string;
  amount: number;
  at: string;
  method: string;
  methodLabel?: string;
  status?: string;
  downloadUrl?: string;
};

const PLAN_META = [
  { id: "free", name: "Free", price: "Free forever", blurb: "5 live listings · 7-day analytics" },
  { id: "silver", name: "Silver", price: `${formatKES(499)}/mo`, blurb: "30 live listings · 30-day analytics · promotions" },
  { id: "gold", name: "Gold", price: `${formatKES(999)}/mo`, blurb: "Unlimited listings · bulk upload · staff · 90-day analytics + CSV" },
];

/**
 * Shop plan checkout — this is the seller's single plan once they own a
 * storefront (personal plan panels are hidden). Pick a plan, then pay.
 * Upgrades stay pending until payment confirms (wallet balance = instant,
 * M-Pesa STK = on callback, or admin confirm). Downgrades apply immediately.
 * Nothing activates unpaid.
 */
export function PlanPanel({ shops, activeSlug, highlightPlan }: { shops: ShopOpt[]; activeSlug: string; highlightPlan?: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(activeSlug);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, PendingPlan | null>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [awaiting, setAwaiting] = useState(false);
  const [topAmt, setTopAmt] = useState("");
  const [topPhone, setTopPhone] = useState("");

  useEffect(() => {
    setSlug(activeSlug);
  }, [activeSlug]);

  const load = async () => {
    try {
      const r = await fetch("/api/shops/plan");
      if (r.ok) setPending(((await r.json()).pending ?? {}) as Record<string, PendingPlan | null>);
    } catch {}
    try {
      const r = await fetch("/api/invoices");
      if (r.ok) setInvoices(((await r.json()).items ?? []) as Invoice[]);
    } catch {}
    try {
      const r = await fetch("/api/wallet");
      if (r.ok) setBalance(((await r.json()).balance ?? 0) as number);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);

  // Auto-refresh the pending upgrade while the Daraja callback confirms it.
  useEffect(() => {
    if (!awaiting) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      try {
        const r = await fetch("/api/shops/plan");
        if (r.ok) {
          const j = (await r.json()) as { pending?: Record<string, PendingPlan | null> };
          if (!(j.pending?.[slug] ?? null)) {
            setAwaiting(false);
            setMsg("Payment confirmed — your shop plan is active ✓");
            await load();
            router.refresh();
            return;
          }
        }
      } catch {}
      if (tries >= 45) {
        setAwaiting(false);
        setMsg("Still waiting for M-Pesa. Refresh once you receive the confirmation SMS.");
      }
    }, 4000);
    return () => clearInterval(t);
  }, [awaiting, slug, router]);

  const current = shops.find((s) => s.slug === slug);
  const currentPlan = current?.planId === "silver" ? "Silver" : current?.planId === "gold" ? "Gold" : "Free";
  const pend = slug ? pending[slug] ?? null : null;
  const pendName = pend ? PLAN_META.find((p) => p.id === pend.planId)?.name ?? pend.planId : "";
  const highlight = highlightPlan && highlightPlan !== current?.planId ? PLAN_META.find((p) => p.id === highlightPlan) : null;

  const choose = async (planId: string) => {
    setBusy(planId);
    setMsg("");
    try {
      const r = await fetch("/api/shops/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug: slug, planId, phone: phone.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Plan change failed.");
      setMsg(j.summary || `${planId} plan updated ✓`);
      setAwaiting(!!j.pending);
      await load();
      if (!j.pending) router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  const clearPending = async () => {
    setBusy("clear");
    setMsg("");
    try {
      const r = await fetch("/api/shops/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug: slug, clearPending: true }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Cancel failed.");
      setMsg("Pending upgrade cancelled — you stay on your current plan.");
      setAwaiting(false);
      await load();
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  const topup = async () => {
    setBusy("topup");
    setMsg("");
    try {
      const r = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(topAmt), phone: topPhone.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Top-up failed.");
      setMsg(j.message || `Wallet topped up ✓ (${formatKES(j.balance ?? 0)} balance).`);
      setTopAmt("");
      await load();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  if (shops.length === 0) {
    return (
      <div className="card border-brand-600 p-5">
        <p className="font-bold">Plans</p>
        <p className="mt-1 text-sm text-ink-500">Create your shop first (left), then pick Free, Silver or Gold here.</p>
        <Link href="/pricing" className="link-bd text-sm">Compare plans →</Link>
      </div>
    );
  }

  return (
    <div className="card border-brand-600 p-5">
      <p className="font-bold">Current plan: {currentPlan}</p>
      <p className="mt-1 text-xs text-ink-500">One plan covers this shop and all its listings. Upgrades need payment first — wallet balance pays instantly, otherwise M-Pesa STK. Downgrades apply immediately.</p>
      {highlight && (
        <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
          You picked <strong>{highlight.name}</strong> on Pricing — confirm it below{highlight.id !== "free" ? " and complete payment to activate" : ""}.
        </p>
      )}
      {pend && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm" role="status">
          <p className="font-bold text-amber-900">Awaiting payment: {pendName} · {formatKES(pend.amount)}</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Still on {currentPlan} until payment confirms. M-Pesa prompt sent to {pend.phone}. This page updates automatically after you pay; an admin confirms manual payments.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => choose(pend.planId)} disabled={busy !== null} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
              {busy === pend.planId ? "Processing…" : `Pay ${formatKES(pend.amount)}${balance !== null ? ` (wallet ${formatKES(balance)})` : ""}`}
            </button>
            <button onClick={clearPending} disabled={busy !== null} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
              Cancel request
            </button>
          </div>
        </div>
      )}
      <label className="mt-3 block text-sm">
        <span className="label-bd">M-Pesa phone (to pay for Silver/Gold)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712345678"
          inputMode="tel"
          className="input-bd"
        />
      </label>
      {shops.length > 1 && (
        <label className="mt-2 block text-sm">
          <span className="label-bd">Shop</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="input-bd">
            {shops.map((s) => <option key={s.slug} value={s.slug}>{s.name} · {s.planId}</option>)}
          </select>
        </label>
      )}
      <div className="mt-3 grid gap-2">
        {PLAN_META.map((p) => {
          const active = current?.planId === p.id;
          const highlighted = highlight?.id === p.id && !active;
          const isUpgrade = (p.id === "silver" && current?.planId === "free") || (p.id === "gold" && current?.planId !== "gold");
          return (
            <div key={p.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm ${active ? "border-brand-600 bg-brand-50" : highlighted ? "border-brand-600 ring-2 ring-brand-600/30" : "border-neutral-200"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.name} · {p.price}{active && " ✓"}</p>
                <p className="text-xs text-ink-500">{p.blurb}</p>
              </div>
              {!active && (
                <button onClick={() => choose(p.id)} disabled={busy !== null} className={highlighted ? "btn-primary shrink-0 !px-3 !py-1.5 text-xs" : "btn-secondary shrink-0 !px-3 !py-1.5 text-xs"}>
                  {busy === p.id ? "Processing…" : isUpgrade ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {msg && <p role="status" className="mt-2 text-sm text-ink-700">{msg}</p>}
      <div className="mt-4 border-t border-neutral-200 pt-3">
        <p className="text-sm font-bold">Wallet {balance !== null && <span className="text-ink-500">· {formatKES(balance)}</span>}</p>
        <p className="mt-0.5 text-xs text-ink-500">Top up with M-Pesa, then upgrades debit the wallet instantly.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={topAmt} onChange={(e) => setTopAmt(e.target.value)} placeholder="Amount KES" inputMode="numeric" aria-label="Top-up amount in KES" className="input-bd min-w-0 flex-1" />
          <input value={topPhone} onChange={(e) => setTopPhone(e.target.value)} placeholder="0712345678" inputMode="tel" aria-label="M-Pesa phone for top-up" className="input-bd min-w-0 flex-1" />
          <button onClick={topup} disabled={busy !== null} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
            {busy === "topup" ? "Sending…" : "Top up"}
          </button>
        </div>
      </div>
      {invoices.length > 0 && (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">Invoices ({invoices.length})</p>
            <Link href="/dashboard/invoices" className="link-bd ml-auto text-xs">View all invoices →</Link>
          </div>
          <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto text-xs text-ink-700">
            {invoices.slice(0, 8).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-sand-50 px-2.5 py-1.5">
                <span className="chip !px-1.5 !py-0 text-[10px]">{i.kind === "promotion" ? "Boost" : "Plan"}</span>
                <strong className="min-w-0 break-words">{i.description || i.planId || i.number || i.id}</strong>
                <span>{formatKES(i.amount)}</span>
                <span className={`chip ${i.status === "paid" || !i.status ? "!border-green-600 !text-green-700" : "!border-amber-500 !text-amber-700"}`}>{i.status ?? "paid"}</span>
                <span className="text-ink-400">{i.at.slice(0, 10)} · {i.methodLabel || i.method}</span>
                {i.downloadUrl && (
                  <a href={i.downloadUrl} className="link-bd inline-flex items-center gap-0.5" aria-label={`Download invoice ${i.number ?? i.id}`}>
                    <Download className="h-3 w-3" /> PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-400">Failed or refunded payments are never counted as revenue. Renewals bill monthly to the same method.</p>
    </div>
  );
}
