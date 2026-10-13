"use client";

import { useState } from "react";
import Link from "next/link";

type BulkResult = { created: number; failed: number; errors: { row: number; error: string }[] };

/** Bulk CSV upload — Gold shops only. */
export function BulkPanel({ shopName, isGold }: { shopName: string; isGold: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [err, setErr] = useState("");

  if (!isGold) {
    return (
      <div className="mt-3 rounded-xl bg-sand-50 p-3 text-sm">
        <p className="font-semibold">Bulk upload (Gold)</p>
        <p className="text-ink-500">Upload whole catalogues via CSV — Gold shops only. <Link href="/pricing" className="link-bd">See Gold →</Link></p>
      </div>
    );
  }

  const upload = async () => {
    if (!file) return setErr("Choose a CSV file first.");
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/listings/bulk", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) return setErr(j.error || "Upload failed.");
      setResult({ created: j.created, failed: j.failed, errors: j.errors ?? [] });
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-sand-50 p-3 text-sm">
      <p className="font-semibold">Bulk upload · {shopName} (Gold ✓)</p>
      <p className="text-ink-500">Download the <a className="link-bd" href="/api/shops">CSV template</a>, fill rows, then upload here. Tenant-isolated: rows land in your catalogue only, queued for moderation.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" aria-label="Upload catalogue CSV" />
        <button onClick={upload} disabled={busy} className="btn-primary !px-4 !py-1.5 text-xs">{busy ? "Uploading…" : "Upload CSV"}</button>
      </div>
      {err && <p role="alert" className="mt-2 text-red-700">{err}</p>}
      {result && (
        <div className="mt-2 rounded-lg bg-white p-3">
          <p className="font-bold">{result.created} created · {result.failed} failed</p>
          {result.errors.length > 0 && (
            <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
              {result.errors.map((e) => <li key={e.row}>Row {e.row}: {e.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
