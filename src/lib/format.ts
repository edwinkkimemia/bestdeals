export const CURRENCY = "KES";

export function formatKES(amount: number): string {
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `KSh ${amount.toLocaleString("en-KE")}`;
  }
}

export function savings(prev: number | null, curr: number): number | null {
  if (!prev || prev <= curr) return null;
  return Math.round(((prev - curr) / prev) * 100);
}

/** Server-truth pricing: qty * unit, minus discount, plus delivery. Never trust client totals. */
export function cartTotals(
  lines: { unitPrice: number; qty: number }[],
  opts?: { discount?: number; deliveryFee?: number }
): { subtotal: number; discount: number; delivery: number; total: number } {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * Math.max(0, l.qty), 0);
  const discount = Math.min(opts?.discount ?? 0, subtotal);
  const delivery = Math.max(0, opts?.deliveryFee ?? 0);
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}

/** Commission owed to platform on a seller suborder. */
export function commissionDue(subtotal: number, rateBps: number): number {
  if (subtotal <= 0 || rateBps <= 0) return 0;
  return Math.round((subtotal * rateBps) / 10000);
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDay(iso);
}

/** Short posting date: "8 Oct" (this year) or "8 Oct 2025" (older). */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** Full posting timestamp: "8 Oct 2026, 14:05". */
export function formatFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  return (
    d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
  );
}
