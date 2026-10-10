"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getListing } from "@/data/catalog";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="container-bd py-12 text-sm">Loading…</div>}>
      <NewMessageInner />
    </Suspense>
  );
}

function NewMessageInner() {
  const sp = useSearchParams();
  const listing = getListing(sp.get("listing") ?? "");
  const [form, setForm] = useState({ name: "", phone: "", message: listing ? `Hi! Is "${listing.title}" still available?` : "" });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div className="container-bd max-w-xl py-8">
      <h1 className="section-title">Contact seller</h1>
      {listing && <p className="text-sm text-ink-500">About: <strong>{listing.title}</strong> — {listing.sellerName}</p>}
      {done ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-lg font-bold">Enquiry sent ✓</p>
          <p className="text-sm text-ink-500">The seller has been notified. Keep chats on Chap until you&apos;re confident. Never pay in advance for classifieds.</p>
          <a href="/dashboard/messages" className="btn-primary mt-4">View my messages</a>
        </div>
      ) : (
        <form
          className="card mt-4 space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            const r = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: listing?.id ?? "general", ...form }) });
            const j = await r.json();
            if (!r.ok) return setErr(j.error || "Failed to send");
            try {
              const box = JSON.parse(localStorage.getItem("bd_messages_v1") || "[]");
              box.unshift({ id: j.id, listing: listing?.title ?? "General enquiry", message: form.message, at: new Date().toISOString() });
              localStorage.setItem("bd_messages_v1", JSON.stringify(box));
            } catch {}
            setDone(true);
          }}
        >
          <div><label className="label-bd" htmlFor="m-name">Your name</label><input id="m-name" className="input-bd" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label-bd" htmlFor="m-phone">Phone</label><input id="m-phone" className="input-bd" placeholder="0712345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
          <div><label className="label-bd" htmlFor="m-msg">Message</label><textarea id="m-msg" className="input-bd" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full">Send enquiry</button>
          <p className="text-xs text-ink-400">Spam-protected & rate-limited. Abusive users can be blocked and reported.</p>
        </form>
      )}
    </div>
  );
}
