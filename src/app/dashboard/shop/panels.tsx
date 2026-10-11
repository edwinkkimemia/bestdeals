"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatKES } from "@/lib/format";

type ShopOpt = { slug: string; name: string; planId: string };

/** Switch the shop's plan (demo billing — activates immediately, no charge). */
export function PlanPanel({ shops, activeSlug }: { shops: ShopOpt[]; activeSlug: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(activeSlug);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const current = shops.find((s) => s.slug === slug);
  const currentPlan = current?.planId === "silver" ? "Silver" : current?.planId === "gold" ? "Gold" : "Free";
  const plans = [
    { id: "free", name: "Free", price: "Free forever", blurb: "5 live listings · 7-day analytics" },
    { id: "silver", name: "Silver", price: `${formatKES(499)}/mo`, blurb: "30 live listings · 30-day analytics · promotions" },
    { id: "gold", name: "Gold", price: `${formatKES(999)}/mo`, blurb: "Unlimited listings · bulk upload · staff · 90-day analytics + CSV" },
  ];

  const choose = async (planId: string) => {
    setBusy(planId);
    setMsg("");
    try {
      const r = await fetch("/api/shops/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug: slug, planId }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Plan change failed.");
      setMsg(`${planId === "free" ? "Free" : planId[0].toUpperCase() + planId.slice(1)} plan active on ${j.shopSlug} ✓`);
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  if (shops.length === 0) {
    return (
      <div className="card border-brand-600 p-5">
        <p className="font-bold">Plans</p>
        <p className="mt-1 text-sm text-ink-500">Create your shop first (left), then pick Free, Silver or Gold here.</p>
        <Link href="/pricing" className="link-bd text-sm">Compare plans →</Link>
      </div>
    );
  }

  return (
    <div className="card border-brand-600 p-5">
      <p className="font-bold">Current plan: {currentPlan}</p>
      {shops.length > 1 && (
        <label className="mt-2 block text-sm">
          <span className="label-bd">Shop</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="input-bd">
            {shops.map((s) => <option key={s.slug} value={s.slug}>{s.name} · {s.planId}</option>)}
          </select>
        </label>
      )}
      <div className="mt-3 grid gap-2">
        {plans.map((p) => {
          const active = current?.planId === p.id;
          return (
            <div key={p.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm ${active ? "border-brand-600 bg-brand-50" : "border-neutral-200"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.name} · {p.price}{active && " ✓"}</p>
                <p className="text-xs text-ink-500">{p.blurb}</p>
              </div>
              {!active && (
                <button onClick={() => choose(p.id)} disabled={busy !== null} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
                  {busy === p.id ? "Switching…" : `Switch to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {msg && <p role="status" className="mt-2 text-sm text-ink-700">{msg}</p>}
      <p className="mt-2 text-xs text-ink-400">Billing records, invoices & renewal reminders live here. Failed or refunded payments are never counted as revenue. M-Pesa plan billing ships separately.</p>
    </div>
  );
}

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

export type StaffMember = { userId: string; role: string; name?: string; email?: string };

/** Staff accounts — Gold shops only. Owner invites sellers by email. */
export function StaffPanel({ shopSlug, shopName, isGold, isOwner, initial }: { shopSlug: string; shopName: string; isGold: boolean; isOwner: boolean; initial: StaffMember[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isGold) return null;

  const refresh = async () => {
    try {
      const r = await fetch(`/api/shops/staff?shopSlug=${encodeURIComponent(shopSlug)}`);
      const j = await r.json();
      if (r.ok) setMembers(j.members ?? []);
    } catch {}
    router.refresh();
  };

  const invite = async () => {
    if (!email.trim()) return setMsg("Enter the staff member's email.");
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/shops/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug, email }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Invite failed.");
      setEmail("");
      setMsg(`${j.member?.name ?? email} added as staff ✓`);
      await refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string, name?: string) => {
    if (!confirm(`Remove ${name ?? "this member"} from ${shopName}?`)) return;
    setMsg("");
    try {
      const r = await fetch("/api/shops/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug, userId }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Remove failed.");
      await refresh();
    } catch {
      setMsg("Network error — try again.");
    }
  };

  return (
    <div className="card mt-3 p-5">
      <p className="font-bold">Staff · {shopName} (Gold ✓)</p>
      <p className="text-sm text-ink-500">Staff can manage your shop&apos;s catalogue. Only the owner can invite or remove.</p>
      <ul className="mt-3 space-y-2">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <strong>{m.name ?? m.email ?? m.userId}</strong>{" "}
              <span className="text-ink-400">· {m.email} · {m.role}</span>
            </span>
            {isOwner && m.role !== "owner" && (
              <button onClick={() => remove(m.userId, m.name ?? m.email)} className="btn-secondary shrink-0 !px-3 !py-1 text-xs">Remove</button>
            )}
          </li>
        ))}
        {members.length === 0 && <li className="text-sm text-ink-500">No staff yet.</li>}
      </ul>
      {isOwner && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.co.ke"
            type="email"
            aria-label="Staff email"
            className="input-bd min-w-0 flex-1"
          />
          <button onClick={invite} disabled={busy} className="btn-primary shrink-0">{busy ? "Inviting…" : "Invite staff"}</button>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm text-ink-700">{msg}</p>}
    </div>
  );
}
