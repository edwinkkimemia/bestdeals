"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Quick delete for listing rows (dashboard list + admin table). The full
 * Manage page has its own delete; this one keeps sellers out of the extra
 * click. Ownership is enforced server-side (`canManageListing`).
 */
export function DeleteListingButton({ id, title }: { id: string; title?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const del = async () => {
    if (!confirm(`Delete "${(title ?? "this listing").slice(0, 60)}" permanently? This can't be undone.`)) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Delete failed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={del}
        title="Delete listing permanently"
        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
