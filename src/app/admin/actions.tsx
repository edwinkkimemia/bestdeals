"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function call(url: string, body: Record<string, unknown>): Promise<string> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return r.ok ? "ok" : j.error || "Failed";
}

/** Small admin action buttons (verify / review / dispute / report / moderate). */
export function AdminButtons({ kind, id, extra }: { kind: "verify" | "review" | "dispute" | "report" | "listing"; id: string; extra?: Record<string, unknown> }) {
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
      : "/api/admin/moderate";
    setMsg(await call(url, { id, ...extra, ...payload }));
    setBusy(false);
    router.refresh();
  };

  const btn = "rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-sand-50 disabled:opacity-50";
  const primary = "rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50";

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
        <button disabled={busy} className={btn} onClick={() => run({})}>Close report</button>
        {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
      </span>
    );
  }
  return (
    <span className="flex gap-1.5">
      <button disabled={busy} className={primary} onClick={() => run({ action: "approve" })}>Approve</button>
      <button disabled={busy} className={btn} onClick={() => run({ action: "hide" })}>Hide</button>
      {msg && msg !== "ok" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
