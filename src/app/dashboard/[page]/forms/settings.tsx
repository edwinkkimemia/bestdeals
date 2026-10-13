"use client";

import { useEffect, useState } from "react";

type Prefs = { sms: boolean; email: boolean };

/** Notification prefs (this device), data export, and account deletion. */
export function SettingsPanel({ email }: { email: string }) {
  const [prefs, setPrefs] = useState<Prefs>({ sms: true, email: true });
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chap_prefs_v1");
      if (raw) setPrefs({ sms: true, email: true, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const save = (next: Prefs) => {
    setPrefs(next);
    try {
      localStorage.setItem("chap_prefs_v1", JSON.stringify(next));
    } catch {}
  };

  const downloadExport = async () => {
    setMsg("");
    const r = await fetch("/api/profile");
    if (!r.ok) return setMsg("Export failed — are you signed in?");
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "chap-my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Downloaded ✓ — your listings, orders, shops, reviews and requests.");
  };

  const deleteAccount = async () => {
    if (confirm !== "DELETE") return setMsg('Type DELETE in the box to confirm.');
    setMsg("");
    const r = await fetch("/api/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    if (!r.ok) return setMsg("Deletion failed.");
    try {
      localStorage.clear();
    } catch {}
    window.location.href = "/?account=deleted";
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-bold">Notifications ({email})</p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.sms} onChange={(e) => save({ ...prefs, sms: e.target.checked })} />
          SMS alerts (order updates, enquiry replies)
        </label>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.email} onChange={(e) => save({ ...prefs, email: e.target.checked })} />
          Email receipts & deal digests (opt-in only)
        </label>
        <p className="mt-1 text-xs text-ink-400">Saved on this device. Marketing email only ever goes out with your consent.</p>
      </div>
      <div className="border-t border-neutral-200 pt-4">
        <p className="font-bold">My data (Data Protection Act, 2019)</p>
        <p className="mt-1 text-sm text-ink-500">Download everything Chap holds on you — profile, listings, orders, shops, reviews, verification and dispute records.</p>
        <button onClick={downloadExport} className="btn-secondary mt-2">Download my data (JSON)</button>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <p className="font-bold text-red-700">Delete my account</p>
        <p className="mt-1 text-sm text-ink-500">Removes your profile, listings, shops and verification docs. Completed-order records are anonymised (kept as transaction evidence, per financial law).</p>
        <input
          aria-label="Type DELETE to confirm"
          placeholder='Type DELETE to confirm'
          className="input-bd mt-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button onClick={deleteAccount} className="mt-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
          Delete my account
        </button>
      </div>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  );
}
