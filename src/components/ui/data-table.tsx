import { Badge } from "@/components/ui/badge";

/**
 * Shared data table: sticky header, zebra rows, horizontal scroll on
 * mobile, consistent empty state. Used by admin sections, order history,
 * verification documents — anywhere rows beat cards.
 */
export function DataTable({ columns, children, empty }: { columns: string[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="card mt-4 overflow-x-auto p-0">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="sticky top-0 bg-sand-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                scope="col"
                className="whitespace-nowrap border-b border-neutral-200 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-ink-500">
                {empty ?? "Nothing here ✓"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Table cell with sensible defaults (top-aligned, padded). */
export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className ?? ""}`}>{children}</td>;
}

const TONE: Record<string, "green" | "amber" | "red" | "blue" | "neutral"> = {
  active: "green",
  approved: "green",
  paid: "green",
  verified: "green",
  delivered: "green",
  confirmed: "green",
  open: "amber",
  pending: "amber",
  pending_payment: "amber",
  shipped: "amber",
  packed: "amber",
  processing: "amber",
  rejected: "red",
  failed: "red",
  expired: "red",
  hidden: "red",
  cancelled: "red",
  closed: "neutral",
  sold: "neutral",
  draft: "neutral",
};

/** Colored status pill shared by every data table. */
export function StatusChip({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{status}</Badge>;
}

/** Short en-KE date for tables (2026-10-13 → 13 Oct 2026). */
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(iso).slice(0, 10);
  }
}

/** Canonical public path for a store listing (preview links). */
export function listingPath(l: { type: string; slug: string }): string {
  return `/${l.type === "classified" ? "classifieds" : l.type === "service" ? "services" : "product"}/${l.slug}`;
}
