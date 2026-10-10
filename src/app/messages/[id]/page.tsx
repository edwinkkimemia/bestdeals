"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { timeAgo } from "@/lib/format";
import { ChatComposer } from "@/components/chat-composer";

type Msg = {
  id: string;
  senderLabel: string;
  bodyHtml: string;
  mine: boolean;
  createdAt: string;
};

export default function ThreadPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="container-bd py-12 text-sm">Loading chat…</div>}>
      <ThreadInner id={params.id} />
    </Suspense>
  );
}

function ThreadInner({ id }: { id: string }) {
  const sp = useSearchParams();
  const [convo, setConvo] = useState<{ listingTitle?: string; sellerName?: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phone, setPhone] = useState(sp.get("phone") ?? "");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bd_phone") || "";
      if (saved && !sp.get("phone")) setPhone(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const qs = phone ? `?phone=${encodeURIComponent(phone)}` : "";
    const r = await fetch(`/api/conversations/${id}${qs}`);
    if (!r.ok) {
      setErr(r.status === 403 ? "This chat isn't yours." : "Chat not found.");
      setReady(true);
      return;
    }
    const j = await r.json();
    setConvo(j.convo);
    setMsgs(j.messages);
    setReady(true);
  }, [id, phone]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (text: string): Promise<string | null> => {
    const r = await fetch(`/api/conversations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, phone: phone || undefined }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Failed to send.";
    try {
      if (phone) localStorage.setItem("bd_phone", phone);
    } catch {}
    window.dispatchEvent(new Event("bd:messages"));
    load();
    return null;
  };

  return (
    <div className="container-bd max-w-2xl py-8">
      <Link href="/messages" className="link-bd text-sm">← All messages</Link>
      <h1 className="section-title mt-2">{convo?.listingTitle ?? "Chat"}</h1>
      {convo?.sellerName && <p className="text-sm text-ink-500">with {convo.sellerName}</p>}

      {!ready ? (
        <p className="mt-4 text-sm text-ink-500">Loading…</p>
      ) : err ? (
        <div className="card mt-4 p-6 text-center">
          <p className="font-bold">{err}</p>
          <Link href="/messages" className="btn-primary mt-4">Back to inbox</Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2" aria-live="polite">
            {msgs.map((m) => (
              <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.mine ? "bg-brand-600 text-white" : "card"}`}>
                  {!m.mine && <p className="mb-0.5 text-xs font-bold text-brand-700">{m.senderLabel}</p>}
                  <div
                    className={`space-y-1 leading-relaxed [&_a]:underline ${m.mine ? "[&_a]:text-white" : ""} [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5`}
                    dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
                  />
                  <p className={`mt-1 text-right text-[11px] ${m.mine ? "text-white/70" : "text-ink-400"}`}>{timeAgo(m.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="card mt-4 space-y-3 p-4">
            <div>
              <label className="label-bd" htmlFor="t-phone">Your phone (guests — matches you to this chat)</label>
              <input id="t-phone" className="input-bd" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <ChatComposer onSend={send} />
            <p className="text-xs text-ink-400">Never pay in advance for classifieds. Report abuse from your inbox.</p>
          </div>
        </>
      )}
    </div>
  );
}
