"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, ChevronLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ChatComposer } from "@/components/chat-composer";

type Msg = {
  id: string;
  senderLabel: string;
  bodyHtml: string;
  mine: boolean;
  read?: boolean;
  createdAt: string;
};

function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-KE", { weekday: "long" });
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export default function ThreadPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="py-12 text-sm">Loading chat…</div>}>
      <ThreadInner id={params.id} />
    </Suspense>
  );
}

function ThreadInner({ id }: { id: string }) {
  const sp = useSearchParams();
  const [convo, setConvo] = useState<{ listingTitle?: string; sellerName?: string; listingId?: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phone, setPhone] = useState(sp.get("phone") ?? "");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bd_phone") || "";
      if (saved && !sp.get("phone")) setPhone(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(
    async (quiet = false) => {
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
      if (!quiet) firstLoad.current = true;
    },
    [id, phone]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 5000);
    const onVis = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  // Stay pinned to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: firstLoad.current ? "auto" : "smooth", block: "end" });
    firstLoad.current = false;
  }, [msgs.length, ready]);

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
    load(true);
    return null;
  };

  if (!ready) {
    return (
      <div className="max-w-2xl">
        <p className="py-12 text-center text-sm text-ink-500">Loading chat…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-2xl">
        <div className="card mt-4 p-6 text-center">
          <p className="font-bold">{err}</p>
          <Link href="/dashboard/messages" className="btn-primary mt-4">Back to inbox</Link>
        </div>
      </div>
    );
  }

  const otherName = convo?.sellerName ?? "Chat";
  let lastDay = "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-sand-50 shadow-card" style={{ height: "min(72dvh, 640px)" }}>
      {/* Chat header */}
      <div className="flex shrink-0 items-center gap-2.5 bg-sand-50 px-3 py-2.5">
        <Link href="/dashboard/messages" aria-label="Back to inbox" className="rounded-full p-1.5 hover:bg-sand-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-black text-white">
          {otherName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">{otherName}</p>
          <p className="truncate text-xs text-ink-500">
            {convo?.listingTitle ? (
              convo.listingId ? (
                <>about <span className="font-semibold">{convo.listingTitle}</span></>
              ) : (
                <>{convo.listingTitle}</>
              )
            ) : (
              "General enquiry"
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5" role="log" aria-label="Messages" aria-live="polite">
        <ul className="space-y-1.5">
          {msgs.length === 0 && (
            <li className="mx-auto mt-6 max-w-xs rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-800 shadow">
              No messages yet — say hi below. Keep chats on Chap until you&apos;re confident, and never pay in advance.
            </li>
          )}
          {msgs.map((m) => {
            const day = dayLabel(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <li key={m.id}>
                {showDay && (
                  <p className="mx-auto my-2 w-fit rounded-lg bg-white px-3 py-1 text-[11px] font-semibold text-ink-500 shadow-sm">
                    {day}
                  </p>
                )}
                <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-sm shadow-sm sm:max-w-[75%] ${
                      m.mine ? "rounded-tr-none bg-brand-600 text-white" : "rounded-tl-none bg-white"
                    }`}
                  >
                    {!m.mine && <p className="text-xs font-bold text-brand-700">{m.senderLabel}</p>}
                    <div
                      className="break-words leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: m.bodyHtml }}
                    />
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] ${m.mine ? "text-white/80" : "text-ink-400"}`}>
                      <span title={new Date(m.createdAt).toLocaleString("en-KE")}>{timeOf(m.createdAt)}</span>
                      {m.mine &&
                        (m.read ? (
                          <CheckCheck className="h-3.5 w-3.5 text-white" aria-label="Read" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-white/70" aria-label="Sent" />
                        ))}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 bg-sand-50 px-3 py-2.5">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex gap-2">
            <label htmlFor="t-phone" className="sr-only">Your phone (guests)</label>
            <input
              id="t-phone"
              className="input-bd !rounded-full !py-2 text-sm"
              placeholder="Guest phone? e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <ChatComposer
            onSend={send}
            whatsapp
            placeholder="Message"
          />
        </div>
      </div>
    </div>
  );
}
