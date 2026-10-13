"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getListing } from "@/data/catalog";
import { ChatComposer } from "@/components/chat-composer";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="py-12 text-sm">Loading…</div>}>
      <NewMessageInner />
    </Suspense>
  );
}

function NewMessageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const listing = getListing(sp.get("listing") ?? "");
  const shopSlug = !listing ? (sp.get("shop") ?? "") : "";
  const [name, setName] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem("bd_phone") || "";
    } catch {
      return "";
    }
  });

  // Signed-in users chat as their account — no name/phone form.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => setSignedIn(r.ok))
      .catch(() => setSignedIn(false));
  }, []);

  const send = async (text: string): Promise<string | null> => {
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing?.id ?? (shopSlug ? `shop:${shopSlug}` : "general"),
        message: text,
        name: signedIn ? undefined : name || undefined,
        phone: signedIn ? undefined : phone || undefined,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Failed to send.";
    try {
      if (phone) localStorage.setItem("bd_phone", phone);
    } catch {}
    router.push(`/dashboard/messages/${j.id}`);
    return null;
  };

  return (
    <div>
      <Link href="/dashboard/messages" className="link-bd inline-flex items-center gap-1 text-sm"><ChevronLeft className="h-4 w-4" /> Inbox</Link>
      <h1 className="section-title mt-1">Message seller</h1>
      {listing ? (
        <p className="mt-1 text-sm text-ink-500">About: <strong>{listing.title}</strong> — {listing.sellerName}</p>
      ) : shopSlug ? (
        <p className="mt-1 text-sm text-ink-500">About shop: <strong>{shopSlug}</strong> — the owner will reply here.</p>
      ) : (
        <p className="mt-1 text-sm text-ink-500">Start a general enquiry.</p>
      )}
      <div className="card mt-4 space-y-3 p-5">
        {!signedIn && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label-bd" htmlFor="m-name">Your name</label><input id="m-name" className="input-bd" value={name} onChange={(e) => setName(e.target.value)} placeholder="Guests only" /></div>
              <div><label className="label-bd" htmlFor="m-phone">Phone</label><input id="m-phone" className="input-bd" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <p className="text-xs text-ink-400">Signed in? We use your account. Guests need a name + Kenyan phone.</p>
          </>
        )}
        <ChatComposer onSend={send} placeholder={`Hi! Is "${listing?.title ?? "this"}" still available?`} />
        <p className="text-xs text-ink-400">Spam-protected & rate-limited. Keep chats on Chap until you&apos;re confident.</p>
      </div>
    </div>
  );
}
