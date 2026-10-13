"use client";

import { useState } from "react";

/** Edit display name + phone. */
export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [n, setN] = useState(name);
  const [p, setP] = useState(phone);
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
            body: JSON.stringify({ name: n, phone: p }),
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
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      {msg && <p role="status" className="text-sm sm:col-span-2">{msg}</p>}
    </form>
  );
}
