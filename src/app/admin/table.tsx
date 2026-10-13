import Link from "next/link";

/**
 * Admin table re-exports — the shared primitives live in
 * @/components/ui/data-table so dashboard + public pages reuse them.
 * Existing `from "../table"` imports keep working unchanged.
 */
export { DataTable as AdminTable, Td, StatusChip, fmtDate, listingPath } from "@/components/ui/data-table";

/** Section heading with icon, shared by admin sections. */
export function SectionHeading({ icon: Icon, children }: { icon: typeof import("lucide-react").Package; children: React.ReactNode }) {
  return (
    <h1 className="section-title flex items-center gap-2">
      <Icon className="h-6 w-6 text-brand-600" /> {children}
    </h1>
  );
}

/** Status filter tabs shared by admin sections (?status=…). */
export function SectionTabs({ base, tabs, current }: { base: string; tabs: string[]; current: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="tablist">
      {tabs.map((t) => (
        <Link key={t} href={`${base}?status=${t}`} className={`chip ${current === t ? "!border-brand-600 !text-brand-700" : ""}`}>{t}</Link>
      ))}
    </div>
  );
}
