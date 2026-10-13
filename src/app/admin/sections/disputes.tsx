import { Scale } from "lucide-react";
import { getStore } from "@/lib/store";
import { AdminButtons } from "../actions";
import { AdminTable, Td, StatusChip, SectionHeading } from "../table";

export async function DisputesSection() {
  const all = await getStore().listDisputes();
  const open = all.filter((d) => !["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));
  const done = all.filter((d) => ["resolved_refund", "resolved_reject", "cancelled"].includes(d.status));
  return (
    <div>
      <SectionHeading icon={Scale}>Disputes ({open.length} open)</SectionHeading>
      <h2 className="mt-4 font-bold">Open ({open.length})</h2>
      <AdminTable columns={["Order", "Reason", "Details", "Status", "Actions"]} empty="None open.">
        {open.map((d) => (
          <tr key={d.id} className="transition hover:bg-sand-50">
            <Td className="whitespace-nowrap"><strong>{d.orderId}</strong></Td>
            <Td>{d.reason}</Td>
            <Td>
              {d.details && <span className="block max-w-72 text-ink-700">{d.details}</span>}
              {d.response && <span className="mt-1 block max-w-72 rounded-lg bg-sand-50 p-2">Seller: {d.response}</span>}
              {!d.details && !d.response && <span className="text-ink-400">—</span>}
            </Td>
            <Td><StatusChip status={d.status} /></Td>
            <Td><AdminButtons kind="dispute" id={d.id} /></Td>
          </tr>
        ))}
      </AdminTable>
      {done.length > 0 && (
        <>
          <h2 className="mt-6 font-bold">Resolved ({done.length})</h2>
          <AdminTable columns={["Order", "Reason", "Status"]}>
            {done.slice(0, 20).map((d) => (
              <tr key={d.id} className="text-ink-500">
                <Td className="whitespace-nowrap">{d.orderId}</Td>
                <Td>{d.reason}</Td>
                <Td><StatusChip status={d.status} /></Td>
              </tr>
            ))}
          </AdminTable>
        </>
      )}
    </div>
  );
}
