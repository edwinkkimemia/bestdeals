"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatKES } from "@/lib/format";
import type { PendingPlan } from "@/lib/plans";

const PLAN_META = [
  { id: "free", name: "Free", price: "Free forever", blurb: "5 live listings · 7-day analytics" },
  { id: "silver", name: "Silver", price: `${formatKES(499)}/mo`, blurb: "30 live listings · 30-day analytics · promotions" },
  { id: "gold", name: "Gold", price: `${formatKES(999)}/mo`, blurb: "Unlimited listings · bulk upload · 90-day analytics" },
];

const planName = (id?: string) =>
  id === "silver" ? "Silver" : id === "gold" ? "Gold" : "Free";

/**
 * Personal seller plan checkout — same prices/limits as shop plans, for
 * sellers without a storefront. Effective plan is the best of this and owned
 * shops. Upgrades stay pending until payment confirms (wallet = instant,
 * M-Pesa STK = on callback, or admin confirm). Downgrades apply immediately.
 */
export function SellerPlanPanel({ planId, highlightPlan }: { planId: string; highlightPlan?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPlan | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/account/plan");
      if (r.ok) setPending(((await r.json()).pending ?? null) as PendingPlan | null);
    } catch {}
    try {
      const r = await fetch("/api/wallet");
      if (r.ok) setBalance(((await r.json()).balance ?? 0) as number);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);

  const pendName = pending ? planName(pending.planId) : "";
  const highlight = highlightPlan && highlightPlan !== planId
    ? PLAN_META.find((p) => p.id === highlightPlan)
    : null;

  const choose = async (id: string) => {
    setBusy(id);
    setMsg("");
    try {
      const r = await fetch("/api/account/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: id, phone: phone.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Plan change failed.");
      setMsg(j.summary || `${id} plan updated ✓`);
      await load();
      router.refresh();
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
      const r = await fetch("/api/account/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearPending: true }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Cancel failed.");
      setMsg("Pending upgrade cancelled — you stay on your current plan.");
      await load();
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card border-brand-600 p-5">
      <p className="font-bold">Personal seller plan: {planName(planId)}</p>
      <p className="mt-1 text-xs text-ink-500">
        Same Silver/Gold limits as shops — no storefront needed. Your effective plan is the best of this and your shops.
      </p>
      {highlight && (
        <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
          You picked <strong>{highlight.name}</strong> on Pricing — confirm it below{highlight.id !== "free" ? " and complete payment to activate" : ""}.
        </p>
      )}
      {pending && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm" role="status">
          <p className="font-bold text-amber-900">Awaiting payment: {pendName} · {formatKES(pending.amount)}</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Still on {planName(planId)} until payment confirms. M-Pesa prompt sent to {pending.phone}. An admin confirms manual payments.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => choose(pending.planId)} disabled={busy !== null} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
              {busy === pending.planId ? "Processing…" : `Pay ${formatKES(pending.amount)}${balance !== null ? ` (wallet ${formatKES(balance)})` : ""}`}
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
      <div className="mt-3 grid gap-2">
        {PLAN_META.map((p) => {
          const active = planId === p.id;
          const highlighted = highlight?.id === p.id && !active;
          const isUpgrade = (p.id === "silver" && planId === "free") || (p.id === "gold" && planId !== "gold");
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
      <p className="mt-2 text-xs text-ink-400">
        Shop plans are separate — manage each storefront below. <Link href="/pricing" className="link-bd">Compare plans →</Link>
      </p>
    </div>
  );
}
