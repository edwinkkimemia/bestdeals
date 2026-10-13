import { Flag } from "lucide-react";
import { getStore } from "@/lib/store";
import { AdminButtons } from "../actions";
import { AdminTable, Td, StatusChip, SectionHeading, SectionTabs, fmtDate } from "../table";

const TABS = ["open", "closed", "all"];

export async function ReportsSection({ status }: { status: string }) {
  const current = TABS.includes(status) ? status : "open";
  const items = await getStore().listReports(current === "all" ? undefined : current);
  return (
    <div>
      <SectionHeading icon={Flag}>Reports ({items.length})</SectionHeading>
      <SectionTabs base="/admin/reports" tabs={TABS} current={current} />
      <AdminTable columns={["Listing", "Reason", "Status", "Date", "Actions"]} empty={`None ${current}.`}>
        {items.map((r) => (
          <tr key={r.id} className="transition hover:bg-sand-50">
            <Td className="whitespace-nowrap">{r.listingId ?? "—"}</Td>
            <Td className="max-w-72">{r.reason}</Td>
            <Td><StatusChip status={r.status} /></Td>
            <Td className="whitespace-nowrap text-ink-500">{fmtDate(r.createdAt)}</Td>
            <Td>{r.status === "open" ? <AdminButtons kind="report" id={r.id} /> : <span className="text-xs text-ink-400">—</span>}</Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
