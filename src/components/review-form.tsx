"use client";

import { useState } from "react";
import Link from "next/link";

/** Leave a review. Posting requires a verified account (badge still needs a paid/delivered order). */
export function ReviewForm({ listingId, shopSlug, sellerName, embedded = false }: { listingId?: string; shopSlug?: string; sellerName: string; embedded?: boolean }) {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsVerify(false);
    setSending(true);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, shopSlug, sellerName, authorName: name.trim() || "Customer", rating, body: body.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403 && j.code === "NOT_VERIFIED") {
          setNeedsVerify(true);
          return;
        }
        setError(j.error || "Could not submit your review.");
        return;
      }
      setDone(true);
      setBody("");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return <p className={embedded ? "text-sm text-green-700" : "card mt-6 p-5 text-sm text-green-700"}>Thanks — your review is queued for moderation and will appear once approved.</p>;
  }

  return (
    <section className={embedded ? "border-t border-neutral-200 pt-5" : "card mt-6 p-5"} aria-label="Write a review">
      <h3 className="font-bold">Write a review</h3>
      <p className="mt-0.5 text-xs text-ink-500">Only verified accounts can review. Orders marked paid/delivered earn the ✓ Verified purchase badge.</p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setRating(n)}
              className={`text-2xl leading-none ${n <= rating ? "text-amber-500" : "text-neutral-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        <div>
          <label className="label-bd" htmlFor="rev-name">Your name</label>
          <input id="rev-name" className="input-bd" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brian K." maxLength={80} />
        </div>
        <div>
          <label className="label-bd" htmlFor="rev-body">Review (optional)</label>
          <textarea id="rev-body" className="input-bd min-h-20" value={body} onChange={(e) => setBody(e.target.value)} placeholder="How was the item and the seller?" maxLength={1000} />
        </div>
        {needsVerify && (
          <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            Only verified accounts can review. <Link href="/dashboard/verify" className="link-bd">Get verified →</Link>
          </p>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary" disabled={sending}>{sending ? "Sending…" : "Submit review"}</button>
      </form>
    </section>
  );
}
