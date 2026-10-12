"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** One-click deploy seed for an empty database (idempotent — safe to re-run). */
export function SeedDatabaseButton() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm("Seed demo users, shops, listings and blog posts into the database? Safe to re-run; admin edits are never overwritten.")) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/seed", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Seed failed — check server logs.");
      const c = j.counts ?? {};
      setMsg(`Seeded ✓ — ${c.users ?? 0} users, ${c.shops ?? 0} shops, ${c.listings ?? 0} listings, ${c.posts ?? 0} posts.`);
      router.refresh();
    } catch {
      setMsg("Seed failed — check server logs.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button onClick={run} disabled={busy} className="btn-primary mt-3">
        {busy ? "Seeding… (up to a minute)" : "Seed demo data"}
      </button>
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
