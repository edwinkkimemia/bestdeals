"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getListing } from "@/data/catalog";
import { ChatComposer } from "@/components/chat-composer";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="container-bd py-12 text-sm">Loading…</div>}>
      <NewMessageInner />
    </Suspense>
  );
}

function NewMessageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const listing = getListing(sp.get("listing") ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem("bd_phone") || "";
    } catch {
      return "";
    }
  });

  const send = async (text: string): Promise<string | null> => {
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing?.id ?? "general", message: text, name: name || undefined, phone: phone || undefined }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Failed to send.";
    try {
      if (phone) localStorage.setItem("bd_phone", phone);
    } catch {}
    router.push(`/messages/${j.id}`);
    return null;
  };

  return (
    <div className="container-bd max-w-xl py-8">
      <h1 className="section-title">Message seller</h1>
      {listing ? (
        <p className="mt-1 text-sm text-ink-500">About: <strong>{listing.title}</strong> — {listing.sellerName}</p>
      ) : (
        <p className="mt-1 text-sm text-ink-500">Start a general enquiry.</p>
      )}
      <div className="card mt-4 space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label-bd" htmlFor="m-name">Your name</label><input id="m-name" className="input-bd" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guests only" /></div>
          <div><label className="label-bd" htmlFor="m-phone">Phone</label><input id="m-phone" className="input-bd" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <p className="text-xs text-ink-400">Signed in? We use your account. Guests need a name + Kenyan phone.</p>
        <ChatComposer onSend={send} placeholder={`Hi! Is "${listing?.title ?? "this"}" still available?`} />
        <p className="text-xs text-ink-400">Spam-protected & rate-limited. Keep chats on Chap until you&apos;re confident.</p>
      </div>
      <Link href="/messages" className="link-bd mt-4 inline-block text-sm">← My messages</Link>
    </div>
  );
}
