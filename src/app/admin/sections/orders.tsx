import { Receipt } from "lucide-react";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { AdminTable, Td, StatusChip, SectionHeading, fmtDate } from "../table";

export async function OrdersSection() {
  const orders = await getStore().listOrders();
  const paid = orders.filter((o) => o.paymentStatus === "paid").length;
  return (
    <div>
      <SectionHeading icon={Receipt}>Orders ({orders.length} · {paid} paid)</SectionHeading>
      <AdminTable columns={["Order", "Buyer", "Total", "Status", "Payment", "Date"]} empty="No orders yet.">
        {orders.map((o) => (
          <tr key={o.id} className="transition hover:bg-sand-50">
            <Td><strong className="whitespace-nowrap">{o.id}</strong></Td>
            <Td>
              <span className="block">{o.name}</span>
              <span className="block text-xs text-ink-500">{o.phone}</span>
            </Td>
            <Td className="whitespace-nowrap font-semibold">{formatKES(o.total)}</Td>
            <Td><StatusChip status={o.status} /></Td>
            <Td><StatusChip status={o.paymentStatus} /></Td>
            <Td className="whitespace-nowrap text-ink-500">{fmtDate(o.createdAt)}</Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
