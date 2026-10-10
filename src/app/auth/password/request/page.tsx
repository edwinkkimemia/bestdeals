"use client";

import { useState } from "react";
import Link from "next/link";

export default function PasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="container-bd max-w-md py-12">
      <h1 className="text-2xl font-bold">Forgot password?</h1>
      <p className="text-sm text-ink-500">Enter your account email — we&apos;ll send a reset link valid for 1 hour.</p>
      <form
        className="card mt-5 space-y-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          setBusy(true);
          try {
            const r = await fetch("/api/auth/password/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const j = await r.json().catch(() => ({}));
            setMsg(r.ok ? (j.message || "Check your email.") : (j.error || "Failed. Try again."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="label-bd" htmlFor="email">Email</label>
          <input id="email" className="input-bd" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {msg && <p role="status" className="rounded-lg bg-sand-50 p-2 text-sm">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        <p className="text-center text-sm"><Link href="/auth/signin" className="link-bd">Back to sign in</Link></p>
      </form>
    </div>
  );
}
