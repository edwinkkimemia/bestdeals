"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

/** Email verification status + resend. */
export function EmailVerifyPanel({ verified, email }: { verified: boolean; email: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (verified) {
    return <p className="flex items-center gap-2 text-sm"><Badge tone="green">✓ Email verified</Badge><span className="text-ink-400">{email}</span></p>;
  }
  return (
    <div className="rounded-xl bg-amber-50 p-3 text-sm">
      <p><strong>Email not verified</strong> — <span className="text-ink-500">{email}</span>. Buyers trust verified addresses.</p>
      {msg && <p role="status" className="mt-1">{msg}</p>}
      <button
        className="btn-secondary mt-2 !px-3 !py-1.5 text-xs"
        disabled={busy}
        onClick={async () => {
          setMsg("");
          setBusy(true);
          try {
            const r = await fetch("/api/auth/email/request", { method: "POST" });
            const j = await r.json().catch(() => ({}));
            setMsg(r.ok ? (j.message || "Link sent.") : (j.error || "Failed."));
          } finally {
            setBusy(false);
          }
        }}
      >{busy ? "Sending…" : "Resend verification link"}</button>
    </div>
  );
}

