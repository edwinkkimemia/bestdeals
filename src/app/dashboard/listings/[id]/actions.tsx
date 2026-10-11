"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManageActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: string) => {
    setMsg("");
    setBusy(true);
    try {
      const r = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Action failed.");
      setMsg(`Status → ${j.status}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this listing permanently? This can't be undone.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!r.ok) return setMsg("Delete failed.");
      router.push("/dashboard/listings");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        {status !== "sold" && (
          <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => run("sold")}>Mark as sold</button>
        )}
        {status === "hidden" ? (
          <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => run("republish")}>Unhide for review</button>
        ) : (
          status !== "sold" && (
            <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => run("hidden")}>Hide</button>
          )
        )}
        {(status === "sold" || status === "rejected" || status === "hidden") && (
          <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => run("republish")}>Republish for review</button>
        )}
        <button className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50" disabled={busy} onClick={del}>Delete</button>
      </div>
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
