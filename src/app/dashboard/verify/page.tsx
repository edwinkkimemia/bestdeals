"use client";

import { useEffect, useState } from "react";

type Item = { id: string; kind: string; status: string; fileName?: string; createdAt: string };

export default function VerifyPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState("id");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch("/api/verify");
    if (r.ok) setItems((await r.json()).items ?? []);
  };
  useEffect(() => {
    load();
    // Business signups land here with ?kind=business — preselect the permit path.
    try {
      if (new URLSearchParams(window.location.search).get("kind") === "business") setKind("business");
    } catch {}
  }, []);

  const approved = items.some((v) => v.status === "approved");

  return (
    <div className="container-bd max-w-xl py-8">
      <h1 className="section-title">Verification</h1>
      <p className="mt-1 text-sm text-ink-500">
        Posting unlocks only after admin verification: national ID (or business permit), your
        account email, and your phone number. The number you confirm here must match your
        account — it becomes your public WhatsApp contact, so buyers always reach the
        number we verified.
      </p>
      {approved && (
        <p className="card mt-4 border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          ✓ Verified — you can post listings and open a shop.
        </p>
      )}

      <form
        className="card mt-4 space-y-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          if (!file) return setMsg("Choose a document photo first.");
          setBusy(true);
          try {
            const fd = new FormData();
            fd.append("private", "1");
            fd.append("files", file);
            const up = await fetch("/api/upload", { method: "POST", body: fd });
            const uj = await up.json();
            if (!up.ok) return setMsg(uj.error || "Upload failed.");
            const r = await fetch("/api/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind, phone, docPath: uj.urls[0], fileName: file.name }),
            });
            const j = await r.json();
            if (!r.ok) return setMsg(j.error || "Failed.");
            setFile(null);
            setMsg("Submitted ✓ — moderators review within 2 business days.");
            load();
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="label-bd" htmlFor="v-kind">Verification type</label>
          <select id="v-kind" className="input-bd" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="id">National ID / Passport (individual)</option>
            <option value="business">Business permit / KRA PIN (business)</option>
          </select>
        </div>
        <div>
          <label className="label-bd" htmlFor="v-phone">Phone number (must match your account — this is your WhatsApp contact)</label>
          <input id="v-phone" className="input-bd" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <p className="mt-1 text-xs text-ink-400">Same number on your profile and WhatsApp. Update it in Profile first if it changed.</p>
        </div>
        <div>
          <label className="label-bd" htmlFor="v-file">National ID / permit photo (JPG/PNG/WebP, ≤5MB)</label>
          <input id="v-file" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {msg && <p role="status" className="rounded-lg bg-sand-50 p-2 text-sm">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Submitting…" : "Submit for verification"}</button>
      </form>

      <h2 className="mt-6 font-bold">My requests</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">No requests yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((v) => (
            <li key={v.id} className="card flex items-center justify-between p-3 text-sm">
              <span>{v.kind === "business" ? "Business" : "ID"} · {v.fileName ?? "document"}</span>
              <span className="chip">{v.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
