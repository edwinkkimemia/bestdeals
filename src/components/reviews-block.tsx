import type { ReviewRecord } from "@/lib/store";
import { Badge } from "./ui/badge";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

/** Approved reviews only — callers must filter by status. Never renders pending. */
export function ReviewsBlock({ reviews, title }: { reviews: ReviewRecord[]; title: string }) {
  if (reviews.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="section-title">{title}</h2>
        <p className="mt-2 text-sm text-ink-500">No verified reviews yet — be the first buyer to leave one after your order.</p>
      </section>
    );
  }
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <section className="mt-10">
      <h2 className="section-title">{title}</h2>
      <p className="mt-1 text-sm text-ink-500">
        <Stars n={Math.round(avg)} /> {avg.toFixed(1)} · {reviews.length} approved review{reviews.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-4 space-y-2">
        {reviews.slice(0, 5).map((r) => (
          <li key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Stars n={r.rating} />
              <strong className="text-sm">{r.authorName}</strong>
              {r.verifiedPurchase ? (
                <Badge tone="green">✓ Verified purchase</Badge>
              ) : (
                <Badge>Community review</Badge>
              )}
              <span className="ml-auto text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString("en-KE")}</span>
            </div>
            {r.body && <p className="mt-1 text-sm text-ink-700">{r.body}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
