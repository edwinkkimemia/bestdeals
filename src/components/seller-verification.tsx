"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileCheck2, Loader2, ShieldCheck, Upload } from "lucide-react";
import { StatusChip, Td } from "@/components/ui/data-table";

type VerificationItem = { id: string; kind: string; status: string; fileName?: string; createdAt: string };
type VerifyUser = {
  verified: boolean;
  emailVerified: boolean;
  sellerKind: string;
  businessName?: string;
  phone?: string;
};

/**
 * Verification-to-first-listing flow shown directly inside /sell. It handles
 * ID/business upload, phone confirmation, status tracking and resubmission
 * without sending new sellers away from the posting screen.
 */
export function SellerVerificationCard({ initialKind, initialPhone }: { initialKind?: string; initialPhone?: string }) {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [who, setWho] = useState<VerifyUser | null>(null);
  const [kind, setKind] = useState(initialKind === "business" ? "business" : "id");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);

  const isBusiness = kind === "business";
  const docsNeeded = who?.sellerKind === "business" ? ["business", "id"] : ["id"];
  const docs = new Set(items.map((v) => v.kind));
  const docsDone = docsNeeded.every((k) => docs.has(k));
  const hasPending = items.some((v) => v.status === "pending");
  const rejected = items.filter((v) => v.status === "rejected");
  const hasRejected = rejected.length > 0;
  const approved = Boolean(who?.verified);
  const needsForm = !approved && (!docsDone || (hasRejected && !hasPending));

  const load = async () => {
    try {
      const r = await fetch("/api/verify", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
      if (j.user) {
        setWho(j.user);
        setKind(j.user.sellerKind === "business" ? "business" : "id");
        if (j.user.phone) setPhone((current) => current || j.user.phone);
      }
    } catch {}
    setLoaded(true);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMsg("");
    setErr("");
    if (!file) return setErr(`Choose your ${isBusiness ? "business permit" : "ID"} photo first.`);
    if (isBusiness && !file2) return setErr("Businesses need both the permit and the owner ID.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("private", "1");
      fd.append("files", file);
      if (isBusiness && file2) fd.append("files", file2);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const uj = await up.json().catch(() => ({}));
      if (!up.ok) {
        setErr(uj.error || "Document upload failed. Try a smaller JPG/PNG/WebP.");
        return;
      }
      const r = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          phone,
          docPath: uj.urls?.[0],
          fileName: file.name,
          ...(isBusiness && file2 ? { docPath2: uj.urls?.[1], fileName2: file2.name } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error || "Could not submit verification.");
        return;
      }
      setFile(null);
      setFile2(null);
      setMsg("Submitted ✓ — verification usually takes 24–48 hours. You can post as soon as it is approved.");
      await load();
    } catch {
      setErr("Upload or submission failed. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mt-4 overflow-hidden" aria-labelledby="sell-verification">
      <div className="border-b border-neutral-200 bg-gradient-to-r from-brand-50 to-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 id="sell-verification" className="font-bold">Verify your seller account</h2>
              <p className="mt-0.5 max-w-2xl text-sm text-ink-500">
                Complete verification here to unlock your first listing. We confirm your phone and review your document — usually within 24–48 hours.
              </p>
            </div>
          </div>
          {approved ? (
            <span className="chip !border-green-600 !text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
          ) : hasPending ? (
            <span className="chip !border-amber-500 !text-amber-700">Under review</span>
          ) : hasRejected ? (
            <span className="chip !border-red-300 !text-red-700">Action needed</span>
          ) : (
            <span className="chip">Not verified</span>
          )}
        </div>
      </div>

      <div className="p-5">
        {!loaded ? (
          <p className="text-sm text-ink-500">Checking verification status…</p>
        ) : (
          <>
            {!who?.emailVerified && (
              <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Confirm your email in <Link href="/dashboard/profile" className="underline">Profile</Link> so we can send verification updates.
              </div>
            )}

            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-ink-400">
                    <tr><th className="py-2">Document</th><th className="py-2">Submitted</th><th className="py-2">Status</th></tr>
                  </thead>
                  <tbody>
                    {items.map((v) => (
                      <tr key={v.id} className="border-b border-neutral-100">
                        <Td><span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand-600" /> {v.kind === "business" ? "Business permit" : "ID"}</span></Td>
                        <Td className="whitespace-nowrap text-ink-500">{new Date(v.createdAt).toLocaleDateString("en-KE")}</Td>
                        <Td><StatusChip status={v.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasRejected && !hasPending && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                <p className="font-semibold">Verification needs attention.</p>
                <p className="mt-0.5">One of your documents was rejected. Re-upload a clear, complete photo below. <Link href="/dashboard/verify" className="underline">See full status →</Link></p>
              </div>
            )}

            {approved ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                Your seller account is verified — the listing form is unlocked.
              </div>
            ) : hasPending && !needsForm ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Documents received — moderation in progress.</p>
                <p className="mt-0.5">You’ll get an in-app notification and push alert when the decision is ready. Usually 24–48 hours.</p>
              </div>
            ) : needsForm ? (
              <form className="mt-4 space-y-3" onSubmit={submit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-bd" htmlFor="sell-v-kind">Verification type</label>
                    <select id="sell-v-kind" className="input-bd" value={kind} onChange={(e) => setKind(e.target.value)}>
                      <option value="id">National ID / Passport (individual)</option>
                      <option value="business">Business permit + owner ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-bd" htmlFor="sell-v-phone">Phone number (must match your account)</label>
                    <input id="sell-v-phone" className="input-bd" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" required inputMode="tel" />
                    <p className="mt-1 text-[11px] text-ink-400">This becomes your public WhatsApp contact. Update it in Profile first if it changed.</p>
                  </div>
                </div>
                <div>
                  <label className="label-bd" htmlFor="sell-v-file">{isBusiness ? "Business permit photo" : "National ID photo"} (JPG/PNG/WebP, ≤5MB)</label>
                  <input id="sell-v-file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full max-w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
                </div>
                {isBusiness && (
                  <div>
                    <label className="label-bd" htmlFor="sell-v-file2">Owner national ID photo (JPG/PNG/WebP, ≤5MB)</label>
                    <input id="sell-v-file2" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full max-w-full text-sm" onChange={(e) => setFile2(e.target.files?.[0] ?? null)} required />
                  </div>
                )}
                {err && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
                {msg && <p role="status" className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{msg}</p>}
                <button className="btn-primary w-full sm:w-auto" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {busy ? "Uploading & submitting…" : hasRejected ? "Resubmit for verification" : "Submit for verification"}
                </button>
                <p className="text-xs text-ink-400">
                  Documents are stored privately and visible only to moderators. Full progress: <Link href="/dashboard/verify" className="link-bd">Verification page →</Link>
                </p>
              </form>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
