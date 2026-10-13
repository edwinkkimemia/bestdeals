"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatKES } from "@/lib/format";
import type { PendingPlan } from "@/lib/plans";

type ShopOpt = { slug: string; name: string; planId: string };
type Invoice = { id: string; shopSlug: string; planId: string; amount: number; at: string; method: string; status?: string };

const PLAN_META = [
  { id: "free", name: "Free", price: "Free forever", blurb: "5 live listings · 7-day analytics" },
  { id: "silver", name: "Silver", price: `${formatKES(499)}/mo`, blurb: "30 live listings · 30-day analytics · promotions" },
  { id: "gold", name: "Gold", price: `${formatKES(999)}/mo`, blurb: "Unlimited listings · bulk upload · staff · 90-day analytics + CSV" },
];

/**
 * Plan checkout: pick a plan, then pay. Upgrades stay pending until payment
 * confirms (wallet balance = instant, M-Pesa STK = on callback, or admin
 * confirm). Downgrades apply immediately. Nothing activates unpaid.
 */
export function PlanPanel({ shops, activeSlug, highlightPlan }: { shops: ShopOpt[]; activeSlug: string; highlightPlan?: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(activeSlug);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, PendingPlan | null>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [topAmt, setTopAmt] = useState("");
  const [topPhone, setTopPhone] = useState("");

  useEffect(() => {
    setSlug(activeSlug);
  }, [activeSlug]);

  const load = async () => {
    try {
      const r = await fetch("/api/shops/plan");
      if (r.ok) setPending(((await r.json()).pending ?? {}) as Record<string, PendingPlan | null>);
    } catch {}
    try {
      const r = await fetch("/api/invoices");
      if (r.ok) setInvoices(((await r.json()).items ?? []) as Invoice[]);
    } catch {}
    try {
      const r = await fetch("/api/wallet");
      if (r.ok) setBalance(((await r.json()).balance ?? 0) as number);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);

  const current = shops.find((s) => s.slug === slug);
  const currentPlan = current?.planId === "silver" ? "Silver" : current?.planId === "gold" ? "Gold" : "Free";
  const pend = slug ? pending[slug] ?? null : null;
  const pendName = pend ? PLAN_META.find((p) => p.id === pend.planId)?.name ?? pend.planId : "";
  const highlight = highlightPlan && highlightPlan !== current?.planId ? PLAN_META.find((p) => p.id === highlightPlan) : null;

  const choose = async (planId: string) => {
    setBusy(planId);
    setMsg("");
    try {
      const r = await fetch("/api/shops/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug: slug, planId, phone: phone.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Plan change failed.");
      setMsg(j.summary || `${planId} plan updated ✓`);
      await load();
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  const clearPending = async () => {
    setBusy("clear");
    setMsg("");
    try {
      const r = await fetch("/api/shops/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopSlug: slug, clearPending: true }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Cancel failed.");
      setMsg("Pending upgrade cancelled — you stay on your current plan.");
      await load();
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(null);
    }
  };

  const topup = async () => {
    setBusy("topup");
    setMsg("");
    try {
      const r = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(topAmt), phone: topPhone.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.error || "Top-up failed.");
      setMsg(j.message || `Wallet topped up ✓ (${formatKES(j.balance ?? 0)} balance).`);
      setTopAmt("");
      await load();
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
      <p className="mt-1 text-xs text-ink-500">Upgrades need payment first — wallet balance pays instantly, otherwise M-Pesa STK. Downgrades apply immediately.</p>
      {highlight && (
        <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
          You picked <strong>{highlight.name}</strong> on Pricing — confirm it below{highlight.id !== "free" ? " and complete payment to activate" : ""}.
        </p>
      )}
      {pend && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm" role="status">
          <p className="font-bold text-amber-900">Awaiting payment: {pendName} · {formatKES(pend.amount)}</p>
          <p className="mt-0.5 text-xs text-amber-800">
            Still on {currentPlan} until payment confirms. M-Pesa prompt sent to {pend.phone}. An admin confirms manual payments.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => choose(pend.planId)} disabled={busy !== null} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs">
              {busy === pend.planId ? "Processing…" : `Pay ${formatKES(pend.amount)}${balance !== null ? ` (wallet ${formatKES(balance)})` : ""}`}
            </button>
            <button onClick={clearPending} disabled={busy !== null} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
              Cancel request
            </button>
          </div>
        </div>
      )}
      <label className="mt-3 block text-sm">
        <span className="label-bd">M-Pesa phone (to pay for Silver/Gold)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0712345678"
          inputMode="tel"
          className="input-bd"
        />
      </label>
      {shops.length > 1 && (
        <label className="mt-2 block text-sm">
          <span className="label-bd">Shop</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="input-bd">
            {shops.map((s) => <option key={s.slug} value={s.slug}>{s.name} · {s.planId}</option>)}
          </select>
        </label>
      )}
      <div className="mt-3 grid gap-2">
        {PLAN_META.map((p) => {
          const active = current?.planId === p.id;
          const highlighted = highlight?.id === p.id && !active;
          const isUpgrade = (p.id === "silver" && current?.planId === "free") || (p.id === "gold" && current?.planId !== "gold");
          return (
            <div key={p.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm ${active ? "border-brand-600 bg-brand-50" : highlighted ? "border-brand-600 ring-2 ring-brand-600/30" : "border-neutral-200"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.name} · {p.price}{active && " ✓"}</p>
                <p className="text-xs text-ink-500">{p.blurb}</p>
              </div>
              {!active && (
                <button onClick={() => choose(p.id)} disabled={busy !== null} className={highlighted ? "btn-primary shrink-0 !px-3 !py-1.5 text-xs" : "btn-secondary shrink-0 !px-3 !py-1.5 text-xs"}>
                  {busy === p.id ? "Processing…" : isUpgrade ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {msg && <p role="status" className="mt-2 text-sm text-ink-700">{msg}</p>}
      <div className="mt-4 border-t border-neutral-200 pt-3">
        <p className="text-sm font-bold">Wallet {balance !== null && <span className="text-ink-500">· {formatKES(balance)}</span>}</p>
        <p className="mt-0.5 text-xs text-ink-500">Top up with M-Pesa, then upgrades debit the wallet instantly.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={topAmt} onChange={(e) => setTopAmt(e.target.value)} placeholder="Amount KES" inputMode="numeric" aria-label="Top-up amount in KES" className="input-bd min-w-0 flex-1" />
          <input value={topPhone} onChange={(e) => setTopPhone(e.target.value)} placeholder="0712345678" inputMode="tel" aria-label="M-Pesa phone for top-up" className="input-bd min-w-0 flex-1" />
          <button onClick={topup} disabled={busy !== null} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
            {busy === "topup" ? "Sending…" : "Top up"}
          </button>
        </div>
      </div>
      {invoices.length > 0 && (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <p className="text-sm font-bold">Invoices ({invoices.length})</p>
          <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto text-xs text-ink-700">
            {invoices.slice(0, 8).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-2 rounded-lg bg-sand-50 px-2.5 py-1.5">
                <strong>{i.planId}</strong>
                <span>{formatKES(i.amount)}</span>
                <span className={`chip ${i.status === "paid" || !i.status ? "!border-green-600 !text-green-700" : "!border-amber-500 !text-amber-700"}`}>{i.status ?? "paid"}</span>
                <span className="text-ink-400">{i.at.slice(0, 10)} · {i.method}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-400">Failed or refunded payments are never counted as revenue. Renewals bill monthly to the same method.</p>
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

export type ShopHeader = {
  slug: string;
  name: string;
  description: string;
  businessCategory: string;
  county: string;
  town: string;
  phone: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  deliveryInfo?: string | null;
  hours?: string | null;
};

/** Editable shop header — logo, cover + public storefront info. Owner only. */
export function ShopHeaderForm({ shop }: { shop: ShopHeader }) {
  const router = useRouter();
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description);
  const [category, setCategory] = useState(shop.businessCategory);
  const [county, setCounty] = useState(shop.county);
  const [town, setTown] = useState(shop.town);
  const [phone, setPhone] = useState(shop.phone);
  const [deliveryInfo, setDeliveryInfo] = useState(shop.deliveryInfo ?? "");
  const [hours, setHours] = useState(shop.hours ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(shop.logoUrl ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(shop.coverUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [msg, setMsg] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (f: File | undefined, kind: "logo" | "cover") => {
    if (!f) return;
    setUploading(kind);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("files", f);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Upload failed — use JPG/PNG/WebP under 5MB.");
      const uploaded = (j.urls as string[] | undefined)?.[0];
      if (!uploaded) return setMsg("Upload failed.");
      if (kind === "logo") setLogoUrl(uploaded);
      else setCoverUrl(uploaded);
    } finally {
      setUploading(null);
      if (logoRef.current) logoRef.current.value = "";
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: shop.slug,
          name,
          description,
          businessCategory: category,
          county,
          town,
          phone,
          deliveryInfo,
          hours,
          logoUrl,
          coverUrl,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Save failed.");
      setMsg("Shop header saved ✓ — live on your storefront.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="card mt-3 space-y-3 p-5">
      <p className="font-bold">Shop header</p>
      <p className="text-sm text-ink-500">Your public cover, logo and shop info — live at <Link href={`/shops/${shop.slug}`} className="link-bd">/shops/{shop.slug}</Link>.</p>
      <div>
        <span className="label-bd">Cover photo</span>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-sand-50">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={`${name} cover`} className="h-32 w-full object-cover" />
          ) : (
            <p className="flex h-32 items-center justify-center text-xs text-ink-400">No cover yet — upload a wide shop photo.</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose cover photo" onChange={(e) => uploadImage(e.target.files?.[0], "cover")} />
          <button type="button" disabled={uploading !== null} onClick={() => coverRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
            {uploading === "cover" ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover"}
          </button>
          {coverUrl && (
            <button type="button" disabled={uploading !== null} onClick={() => setCoverUrl(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-sand-50">
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand-100 text-xl font-black text-ink-400">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>
        <div>
          <span className="label-bd">Logo</span>
          <div className="flex flex-wrap gap-2">
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose shop logo" onChange={(e) => uploadImage(e.target.files?.[0], "logo")} />
            <button type="button" disabled={uploading !== null} onClick={() => logoRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-xs">
              {uploading === "logo" ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
            </button>
            {logoUrl && (
              <button type="button" disabled={uploading !== null} onClick={() => setLogoUrl(null)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-sand-50">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label-bd" htmlFor="sh-name">Shop name</label>
          <input id="sh-name" className="input-bd" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={80} />
        </div>
        <div className="sm:col-span-2">
          <label className="label-bd" htmlFor="sh-desc">About your shop</label>
          <textarea id="sh-desc" className="input-bd min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-cat">Category</label>
          <input id="sh-cat" className="input-bd" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Electronics retail" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-phone">Shop phone (WhatsApp)</label>
          <input id="sh-phone" className="input-bd" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-county">County</label>
          <input id="sh-county" className="input-bd" value={county} onChange={(e) => setCounty(e.target.value)} />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-town">Town</label>
          <input id="sh-town" className="input-bd" value={town} onChange={(e) => setTown(e.target.value)} />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-delivery">Delivery info</label>
          <input id="sh-delivery" className="input-bd" value={deliveryInfo} onChange={(e) => setDeliveryInfo(e.target.value)} maxLength={500} placeholder="Same-day in Nairobi…" />
        </div>
        <div>
          <label className="label-bd" htmlFor="sh-hours">Opening hours</label>
          <input id="sh-hours" className="input-bd" value={hours} onChange={(e) => setHours(e.target.value)} maxLength={200} placeholder="Mon–Sat 8am–7pm" />
        </div>
      </div>
      <button className="btn-primary w-full" disabled={busy || uploading !== null}>{busy ? "Saving…" : "Save shop header"}</button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </form>
  );
}
