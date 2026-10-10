"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="container-bd max-w-md py-12">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="text-sm text-ink-500">Minimum 8 characters. Your old reset links stop working after this.</p>
      <form
        className="card mt-5 space-y-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          if (!token) return setMsg("Missing reset token — open the link from your email.");
          if (pw.length < 8) return setMsg("Password must be at least 8 characters.");
          if (pw !== pw2) return setMsg("Passwords don't match.");
          setBusy(true);
          try {
            const r = await fetch("/api/auth/password/reset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password: pw }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) return setMsg(j.error || "Reset failed.");
            router.push("/auth/signin?reset=1");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="label-bd" htmlFor="pw">New password</label>
          <input id="pw" className="input-bd" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div>
          <label className="label-bd" htmlFor="pw2">Confirm new password</label>
          <input id="pw2" className="input-bd" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        {msg && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
        <p className="text-center text-sm"><Link href="/auth/password/request" className="link-bd">Request a new link</Link></p>
      </form>
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div className="container-bd max-w-md py-12 text-sm text-ink-500">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
