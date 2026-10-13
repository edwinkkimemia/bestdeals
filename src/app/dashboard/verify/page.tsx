"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

type Item = { id: string; kind: string; status: string; fileName?: string; createdAt: string };
type Who = { verified: boolean; emailVerified: boolean; sellerKind: string; businessName?: string };

type StepState = "done" | "current" | "pending" | "blocked";

function Step({
  n,
  state,
  title,
  text,
  action,
}: {
  n: number;
  state: StepState;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  const dot =
    state === "done"
      ? "bg-green-600 text-white"
      : state === "current"
        ? "bg-brand-600 text-white"
        : state === "blocked"
          ? "bg-red-600 text-white"
          : "bg-neutral-200 text-ink-400";
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${dot}`}>
          {state === "done" ? "✓" : state === "blocked" ? "!" : n}
        </span>
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-sm text-ink-500">{text}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </li>
  );
}

export default function VerifyPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [who, setWho] = useState<Who>({ verified: false, emailVerified: false, sellerKind: "individual" });
  const [kind, setKind] = useState("id");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isBusiness = kind === "business";

  const load = async () => {
    try {
      const r = await fetch("/api/verify");
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.items ?? []);
      if (j.user) {
        setWho(j.user);
        if (!loaded) setKind(j.user.sellerKind === "business" ? "business" : "id");
      }
    } catch {}
    setLoaded(true);
  };
  useEffect(() => {
    load();
    // Business signups land here with ?kind=business — preselect the permit path.
    try {
      if (new URLSearchParams(window.location.search).get("kind") === "business") setKind("business");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kinds = new Set(items.map((v) => v.kind));
  const hasPending = items.some((v) => v.status === "pending");
  const hasRejected = items.some((v) => v.status === "rejected");
  const docsNeeded = who.sellerKind === "business" ? ["business", "id"] : ["id"];
  const docsDone = docsNeeded.every((k) => kinds.has(k));
  const approved = who.verified;

  const steps: { title: string; text: string; state: StepState; action?: React.ReactNode }[] = [
    {
      title: "Account created",
      text: "You're signed in — this step is done.",
      state: "done",
    },
    {
      title: "Confirm your email",
      text: who.emailVerified
        ? "Email confirmed ✓ — buyers trust verified contacts."
        : "Check your inbox for the confirmation link — it builds buyer trust.",
      state: who.emailVerified ? "done" : "current",
      action: !who.emailVerified ? (
        <Link href="/dashboard/profile" className="link-bd text-sm">Verify email in Profile →</Link>
      ) : undefined,
    },
    {
      title:
        who.sellerKind === "business"
          ? "Submit permit + owner ID"
          : "Submit your ID",
      text: docsDone
        ? who.sellerKind === "business"
          ? "Permit and owner ID received ✓ — admins review both."
          : "ID received ✓ — admins review it next."
        : who.sellerKind === "business"
          ? "Businesses need two documents: the business permit and the owner national ID."
          : "One clear photo of your national ID or passport.",
      state: docsDone ? "done" : "current",
    },
    {
      title: "Admin review",
      text: approved
        ? "Approved ✓ — usually within 2 business days."
        : hasRejected && !hasPending
          ? "A document was rejected — check why below and resubmit."
          : hasPending
            ? "In the moderation queue — usually decided within 2 business days."
            : "Starts as soon as your documents are in.",
      state: approved ? "done" : hasRejected && !hasPending ? "blocked" : hasPending ? "current" : "pending",
    },
    {
      title: "Verified — post & sell",
      text: approved
        ? "You hold the ✓ badge — post listings and open your shop."
        : "Unlocks the moment an admin approves.",
      state: approved ? "done" : "pending",
      action: approved ? (
        <span className="flex flex-wrap gap-2">
          <Link href="/sell" className="btn-primary !px-4 !py-2 text-sm">Post a listing</Link>
          <Link href="/dashboard/shop" className="btn-secondary !px-4 !py-2 text-sm">Open your shop</Link>
        </span>
      ) : undefined,
    },
  ];
  const doneCount = steps.filter((s) => s.state === "done").length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const needsForm = !approved && (!docsDone || (hasRejected && !hasPending));

  return (
    <div>
      <h1 className="section-title flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-brand-600" /> Verification progress</h1>
      <p className="mt-1 text-sm text-ink-500">
        Posting unlocks only after admin verification{who.businessName ? <> · trading as <strong>{who.businessName}</strong></> : null}.
        The phone you confirm must match your account — it becomes your public WhatsApp contact.
      </p>

      {/* progress bar */}
      <div className="card mt-4 p-5" aria-label={`Verification ${pct}% complete`}>
        <div className="flex items-baseline justify-between">
          <p className="font-bold">{pct}% complete</p>
          <p className="text-xs text-ink-400">{doneCount} of {steps.length} steps</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sand-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all ${approved ? "bg-green-600" : "bg-brand-600"}`} style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-5">
          {steps.map((s, i) => (
            <Step key={s.title} n={i + 1} state={s.state} title={s.title} text={s.text} action={s.action} />
          ))}
        </ol>
      </div>

      {/* documents on file */}
      <h2 className="mt-8 font-bold">Documents on file ({items.length})</h2>
      {!loaded ? (
        <p className="mt-2 text-sm text-ink-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">Nothing submitted yet — use the form below.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((v) => (
            <li key={v.id} className="card flex items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0">
                <strong>{v.kind === "business" ? "Business permit" : "ID"}</strong>
                <span className="block truncate text-xs text-ink-400">{v.fileName ?? "document"} · {new Date(v.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
              </span>
              <span className={`chip shrink-0 ${v.status === "approved" ? "!border-green-600 !text-green-700" : v.status === "rejected" ? "!border-red-600 !text-red-700" : ""}`}>
                {v.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* submit / resubmit */}
      {needsForm && (
        <form
          className="card mt-6 space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg("");
            if (!file) return setMsg("Choose a document photo first.");
            if (isBusiness && !file2) return setMsg("Businesses need both: the permit AND the owner ID.");
            setBusy(true);
            try {
              const fd = new FormData();
              fd.append("private", "1");
              fd.append("files", file);
              if (isBusiness && file2) fd.append("files", file2);
              const up = await fetch("/api/upload", { method: "POST", body: fd });
              const uj = await up.json();
              if (!up.ok) return setMsg(uj.error || "Upload failed.");
              const r = await fetch("/api/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  kind, phone, docPath: uj.urls[0], fileName: file.name,
                  ...(isBusiness && file2 ? { docPath2: uj.urls[1], fileName2: file2.name } : {}),
                }),
              });
              const j = await r.json();
              if (!r.ok) return setMsg(j.error || "Failed.");
              setFile(null);
              setFile2(null);
              setMsg("Submitted ✓ — moderators review within 2 business days.");
              load();
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-bold">{hasRejected ? "Resubmit documents" : "Submit documents"}</h2>
          <div>
            <label className="label-bd" htmlFor="v-kind">Verification type</label>
            <select id="v-kind" className="input-bd" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="id">National ID / Passport (individual)</option>
              <option value="business">Business permit + owner ID (business)</option>
            </select>
          </div>
          <div>
            <label className="label-bd" htmlFor="v-phone">Phone number (must match your account — this is your WhatsApp contact)</label>
            <input id="v-phone" className="input-bd" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <p className="mt-1 text-xs text-ink-400">Same number on your profile and WhatsApp. Update it in Profile first if it changed.</p>
          </div>
          <div>
            <label className="label-bd" htmlFor="v-file">{isBusiness ? "Business permit photo" : "National ID photo"} (JPG/PNG/WebP, ≤5MB)</label>
            <input id="v-file" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {isBusiness && (
            <div>
              <label className="label-bd" htmlFor="v-file2">Owner national ID photo (JPG/PNG/WebP, ≤5MB)</label>
              <input id="v-file2" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm"
                onChange={(e) => setFile2(e.target.files?.[0] ?? null)} />
            </div>
          )}
          {msg && <p role="status" className="rounded-lg bg-sand-50 p-2 text-sm">{msg}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Submitting…" : hasRejected ? "Resubmit for verification" : "Submit for verification"}</button>
        </form>
      )}
    </div>
  );
}
