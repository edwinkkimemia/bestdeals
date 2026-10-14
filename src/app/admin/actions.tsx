"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function call(url: string, body: Record<string, unknown>): Promise<string> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return r.ok ? "ok" : j.error || "Failed";
}

/** Small admin action buttons (verify / review / dispute / report / moderate / plan-audit). */
export function AdminButtons({ kind, id, extra }: { kind: "verify" | "review" | "dispute" | "report" | "listing" | "user" | "shop" | "planaudit"; id: string; extra?: Record<string, unknown> }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setMsg("");
    const url =
      kind === "verify" ? "/api/admin/verifications"
      : kind === "review" ? "/api/admin/reviews"
      : kind === "dispute" ? "/api/admin/disputes"
      : kind === "report" ? "/api/admin/reports"
      : kind === "user" ? "/api/admin/users"
      : kind === "shop" ? "/api/admin/shops"
      : kind === "planaudit" ? "/api/admin/plan-audit"
      : "/api/admin/moderate";
    setMsg(await call(url, { id, ...extra, ...payload }));
    setBusy(false);
    router.refresh();
  };

  const btn = "rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-sand-50 disabled:opacity-50";
  const primary = "rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50";

  if (kind === "planaudit") {
    return (
      <span className="flex gap-1.5">
        <button
          disabled={busy}
          className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          onClick={() => {
            if (!confirm("Assign the matching plan to this account? Upgrades only — nothing is ever downgraded here.")) return;
            run({ userId: id });
          }}
        >
          Assign plan
        </button>
        {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
      </span>
    );
  }

  if (kind === "user" || kind === "shop") {
    const verified = Boolean(extra?.verified);
    const del = async () => {
      if (kind !== "user") return;
      if (!confirm("Delete this account permanently? Their listings are removed; orders stay anonymised. This can't be undone.")) return;
      setBusy(true);
      setMsg("");
      try {
        const r = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const j = await r.json().catch(() => ({}));
        setMsg(r.ok ? "ok" : j.error || "Delete failed.");
        router.refresh();
      } finally {
        setBusy(false);
      }
    };
    return (
      <span className="flex gap-1.5">
        <button disabled={busy} className={verified ? btn : primary} onClick={() => run(kind === "shop" ? { slug: id, verified: !verified } : { verified: !verified })}>
          {verified ? "Revoke ✓" : "Verify"}
        </button>
        {kind === "user" && (
          <button disabled={busy} className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={del}>
            Delete
          </button>
        )}
        {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
      </span>
    );
  }

  if (kind === "verify" || kind === "review") {
    return (
      <span className="flex gap-1.5">
        <button disabled={busy} className={primary} onClick={() => run({ approve: true })}>Approve</button>
        <button disabled={busy} className={btn} onClick={() => run({ approve: false })}>Reject</button>
        {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
      </span>
    );
  }
  if (kind === "dispute") {
    return (
      <span className="flex gap-1.5">
        <button disabled={busy} className={primary} onClick={() => run({ outcome: "refund" })}>Refund buyer</button>
        <button disabled={busy} className={btn} onClick={() => run({ outcome: "reject" })}>Rule for seller</button>
        {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
      </span>
    );
  }
  if (kind === "report") {
    return (
      <span className="flex gap-1.5">
        <button disabled={busy} className={btn} onClick={() => run({ action: "close" })}>Close report</button>
        <button disabled={busy} className={primary} onClick={() => run({ action: "hide" })} title="Close + hide the reported listing">Hide listing</button>
        {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
      </span>
    );
  }
  const delListing = async () => {
    if (!confirm("Delete this listing permanently? This can't be undone.")) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? "ok" : j.error || "Delete failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="flex gap-1.5">
      <button disabled={busy} className={primary} onClick={() => run({ action: "approve" })}>Approve</button>
      <button disabled={busy} className={btn} onClick={() => run({ action: "hide" })}>Hide</button>
      <button disabled={busy} className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={delListing}>Delete</button>
      {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}

/** Admin plan payment confirmation (pending upgrade → activate). */
export function PlanConfirmButton({ shopSlug, planId, amount }: { shopSlug: string; planId: string; amount: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!confirm(`Confirm ${planId} payment for this shop and activate it?`)) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/shops/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopSlug, planId, confirm: true }),
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "ok" : j.error || "Failed");
    setBusy(false);
    router.refresh();
  };
  const primary = "rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50";
  return (
    <span className="flex items-center gap-1.5">
      <button disabled={busy} className={primary} onClick={run} title={`Confirm ${planId} payment (${amount} KES) and activate`}>
        Confirm {planId} payment
      </button>
      {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}

/** Admin promotion actions (payment confirmed → activate; expire; cancel). */
export function PromoButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action: string) => {
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/promotions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "ok" : j.error || "Failed");
    setBusy(false);
    router.refresh();
  };
  const btn = "rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-sand-50 disabled:opacity-50";
  const primary = "rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50";
  return (
    <span className="flex gap-1.5">
      {status === "pending_payment" && <button disabled={busy} className={primary} onClick={() => run("activate")}>Confirm payment</button>}
      {["pending_payment", "active"].includes(status) && <button disabled={busy} className={btn} onClick={() => run(status === "active" ? "expire" : "cancel")}>{status === "active" ? "Expire" : "Cancel"}</button>}
      {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
