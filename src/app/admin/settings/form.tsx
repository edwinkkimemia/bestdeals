"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SettingsInitial = {
  announcement_enabled: boolean;
  announcement_text: string;
  support_email: string;
  support_phone: string;
  support_whatsapp: string;
  registrations_open: boolean;
  commission_bps: number;
};

/** Admin site-settings form: announcement, support contacts, registrations, commission. */
export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const [annOn, setAnnOn] = useState(initial.announcement_enabled);
  const [annText, setAnnText] = useState(initial.announcement_text);
  const [email, setEmail] = useState(initial.support_email);
  const [phone, setPhone] = useState(initial.support_phone);
  const [whatsapp, setWhatsapp] = useState(initial.support_whatsapp);
  const [regOpen, setRegOpen] = useState(initial.registrations_open);
  const [bps, setBps] = useState(String(initial.commission_bps));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement_enabled: annOn,
          announcement_text: annText,
          support_email: email,
          support_phone: phone,
          support_whatsapp: whatsapp,
          registrations_open: regOpen,
          commission_bps: Number(bps),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "Save failed.");
      setMsg("Settings saved ✓ — live across the site.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid max-w-2xl gap-3">
      <div className="card space-y-3 p-5">
        <p className="font-bold">Storefront announcement</p>
        <p className="text-sm text-ink-500">A dismissible bar above the header on every public page. Keep it short.</p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={annOn} onChange={(e) => setAnnOn(e.target.checked)} />
          Show announcement bar
        </label>
        <div>
          <label className="label-bd" htmlFor="st-ann">Announcement text</label>
          <input id="st-ann" className="input-bd" value={annText} onChange={(e) => setAnnText(e.target.value)} maxLength={200} placeholder="e.g. Free delivery in Nairobi this weekend 🎉" />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <p className="font-bold">Support contacts</p>
        <p className="text-sm text-ink-500">Shown in the site footer so buyers can reach you.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-bd" htmlFor="st-email">Support email</label>
            <input id="st-email" type="email" className="input-bd" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@chap.co.ke" />
          </div>
          <div>
            <label className="label-bd" htmlFor="st-phone">Support phone</label>
            <input id="st-phone" className="input-bd" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0712345678" />
          </div>
          <div>
            <label className="label-bd" htmlFor="st-wa">WhatsApp</label>
            <input id="st-wa" className="input-bd" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="0712345678" />
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <p className="font-bold">Access & money</p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={regOpen} onChange={(e) => setRegOpen(e.target.checked)} />
          Registrations open <span className="font-normal text-ink-400">(unticked = new signups are refused)</span>
        </label>
        <div>
          <label className="label-bd" htmlFor="st-bps">Default commission (basis points)</label>
          <input id="st-bps" type="number" min={0} max={3000} step={1} className="input-bd max-w-48" value={bps} onChange={(e) => setBps(e.target.value)} required />
          <p className="mt-1 text-xs text-ink-400">
            {(Number(bps) / 100 || 0).toFixed(2)}% per seller suborder at checkout. 500 = 5%.
          </p>
        </div>
      </div>

      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </form>
  );
}
