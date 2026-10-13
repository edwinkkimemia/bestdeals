"use client";

import { Suspense } from "react";
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
  const toUser = !listing && !shopSlug ? (sp.get("user") ?? "") : "";

  const send = async (text: string): Promise<string | null> => {
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing?.id ?? (shopSlug ? `shop:${shopSlug}` : "general"),
        message: text,
        toUserId: toUser || undefined,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return j.error || "Failed to send.";
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
      ) : toUser ? (
        <p className="mt-1 text-sm text-ink-500">Direct message — delivered straight to the seller&apos;s inbox.</p>
      ) : (
        <p className="mt-1 text-sm text-ink-500">Start a general enquiry.</p>
      )}
      <div className="card mt-4 space-y-3 p-5">
        <p className="text-xs text-ink-400">You chat as your signed-in account.</p>
        <ChatComposer onSend={send} placeholder={`Hi! Is "${listing?.title ?? "this"}" still available?`} />
        <p className="text-xs text-ink-400">Spam-protected & rate-limited. Keep chats on Chap until you&apos;re confident.</p>
      </div>
    </div>
  );
}
