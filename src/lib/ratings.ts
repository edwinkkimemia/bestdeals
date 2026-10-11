/** Real-data shop ratings: average of approved (moderated) reviews only. Never fabricated. */

export function avgRatingOf(reviews: { rating: number }[]): { avg: number; count: number } | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

/** Display label: "★ 4.7 (12)" or "No reviews yet" — no fake numbers. */
export function ratingLabel(reviews: { rating: number }[]): string {
  const r = avgRatingOf(reviews);
  return r ? `★ ${r.avg.toFixed(1)} (${r.count})` : "No reviews yet";
}
