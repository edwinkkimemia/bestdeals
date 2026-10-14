"use client";

import { useState } from "react";

/** Edit display name + phone + seller bio (shown on the seller page). */
export function ProfileForm({ name, phone, bio }: { name: string; phone: string; bio?: string | null }) {
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
  const [b, setB] = useState(bio ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg("");
        setBusy(true);
        try {
          const r = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: n, phone: p, bio: b.trim() ? b.trim() : null }),
          });
          const j = await r.json();
          setMsg(r.ok ? "Saved ✓" : j.error || "Failed.");
          if (r.ok) window.location.reload();
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label-bd" htmlFor="pf-name">Display name</label>
        <input id="pf-name" className="input-bd" value={n} onChange={(e) => setN(e.target.value)} required />
      </div>
      <div>
        <label className="label-bd" htmlFor="pf-phone">Phone (M-Pesa + alerts)</label>
        <input id="pf-phone" className="input-bd" value={p} onChange={(e) => setP(e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label className="label-bd" htmlFor="pf-bio">Seller bio (public — max 500 characters)</label>
        <textarea
          id="pf-bio"
          className="input-bd min-h-20"
          value={b}
          onChange={(e) => setB(e.target.value.slice(0, 500))}
          placeholder="e.g. Genuine phones and accessories in Nairobi CBD. Warranty on every sale."
          maxLength={500}
        />
        <p className="mt-0.5 text-xs text-ink-400">{b.length}/500 — shown on your seller page and in search results.</p>
      </div>
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      {msg && <p role="status" className="text-sm sm:col-span-2">{msg}</p>}
    </form>
  );
}
