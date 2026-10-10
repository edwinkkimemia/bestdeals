"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setMsg("");
    if (!token) return setMsg("Missing token — open the link from your email.");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Verification failed.");
      setOk(true);
      setMsg(j.message || "Email verified ✓");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-bd max-w-md py-12">
      <h1 className="text-2xl font-bold">Verify your email</h1>
      <p className="text-sm text-ink-500">One click confirms your address — it helps buyers trust your listings.</p>
      <div className="card mt-5 space-y-3 p-5">
        {!token && <p className="text-sm text-ink-500">No token in this link. Request a fresh one from your dashboard or profile.</p>}
        {msg && <p role="status" className={`rounded-lg p-2 text-sm ${ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg}</p>}
        {!ok && token && (
          <button className="btn-primary w-full" disabled={busy} onClick={confirm}>{busy ? "Verifying…" : "Confirm my email"}</button>
        )}
        {ok && <Link href="/dashboard" className="btn-primary w-full">Go to dashboard</Link>}
        <p className="text-center text-sm"><Link href="/dashboard/profile" className="link-bd">Resend link from profile →</Link></p>
      </div>
    </div>
  );
}

export default function EmailVerifyPage() {
  return (
    <Suspense fallback={<div className="container-bd max-w-md py-12 text-sm text-ink-500">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
