"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getListing } from "@/data/catalog";
import { formatKES } from "@/lib/format";
import { newChatListingId } from "@/lib/chat-access";
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
  // The raw ?listing= value is authoritative: seller-posted listings live in
  // the store, NOT the static catalogue — getListing() misses them, but the
  // id must still be sent so the server can pin the real owner.
  const listingParam = sp.get("listing") ?? "";
  const listing = getListing(listingParam);
  const shopSlug = !listing && !listingParam.trim() ? (sp.get("shop") ?? "") : "";
  const toUser = !listing && !listingParam.trim() && !shopSlug ? (sp.get("user") ?? "") : "";
  const [resolved, setResolved] = useState<{ title: string; seller: string; price?: number } | null>(null);

  // Store-listing context for the header (catalogue hits render instantly).
  useEffect(() => {
    if (!listingParam || listing) {
      setResolved(null);
      return;
    }
    let live = true;
    fetch(`/api/listings/resolve?ids=${encodeURIComponent(listingParam.trim())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const it = j?.items?.[0] as { title?: string; seller?: string; price?: number } | undefined;
        if (live && it?.title) setResolved({ title: it.title, seller: it.seller ?? "Seller", price: it.price });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [listingParam, listing]);

  const send = async (text: string): Promise<string | null> => {
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: newChatListingId(listingParam, listing?.id, shopSlug),
        message: text,
        toUserId: toUser || undefined,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Failed to send.";
    router.push(`/dashboard/messages/${j.id}`);
    return null;
  };

  const aboutTitle = listing?.title ?? resolved?.title;
  const aboutSeller = listing?.sellerName ?? resolved?.seller;
  const aboutPrice = listing?.price ?? resolved?.price;
  const draft = aboutTitle
    ? `Hi, I'm interested in "${aboutTitle}"${aboutPrice && aboutPrice > 0 ? ` (${formatKES(aboutPrice)})` : ""}. Is it still available?`
    : "";

  return (
    <div>
      <Link href="/dashboard/messages" className="link-bd inline-flex items-center gap-1 text-sm"><ChevronLeft className="h-4 w-4" /> Inbox</Link>
      <h1 className="section-title mt-1">Message seller</h1>
      {aboutTitle ? (
        <p className="mt-1 text-sm text-ink-500">About: <strong>{aboutTitle}</strong> — {aboutSeller}</p>
      ) : shopSlug ? (
        <p className="mt-1 text-sm text-ink-500">About shop: <strong>{shopSlug}</strong> — the owner will reply here.</p>
      ) : toUser ? (
        <p className="mt-1 text-sm text-ink-500">Direct message — delivered straight to the seller&apos;s inbox.</p>
      ) : listingParam ? (
        <p className="mt-1 text-sm text-ink-500">About this listing — the seller will reply here.</p>
      ) : (
        <p className="mt-1 text-sm text-ink-500">Start a general enquiry.</p>
      )}
      <div className="card mt-4 space-y-3 p-5">
        <p className="text-xs text-ink-400">You chat as your signed-in account.</p>
        <ChatComposer onSend={send} initialText={draft} placeholder={`Hi! Is "${aboutTitle ?? "this"}" still available?`} />
        <p className="text-xs text-ink-400">Spam-protected & rate-limited. Keep chats on Chap until you&apos;re confident.</p>
      </div>
    </div>
  );
}
