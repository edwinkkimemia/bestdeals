import { Megaphone } from "lucide-react";
import { getStore } from "@/lib/store";
import { formatKES } from "@/lib/format";
import { PromoButtons } from "../actions";
import { AdminTable, Td, StatusChip, SectionHeading, SectionTabs, fmtDate } from "../table";

const TABS = ["pending_payment", "active", "cancelled", "expired", "all"];

export async function PromotionsSection({ status }: { status: string }) {
  const store = getStore();
  const current = TABS.includes(status) ? status : "pending_payment";
  await store.sweepExpiredPromotions().catch(() => null);
  const items = await store.listPromotions(current === "all" ? undefined : current);
  return (
    <div>
      <SectionHeading icon={Megaphone}>Promotions & boosts ({items.length})</SectionHeading>
      <p className="mt-1 text-sm text-ink-500">Confirm M-Pesa payment to activate a boost; the listing gets its Featured badge.</p>
      <SectionTabs base="/admin/promotions" tabs={TABS} current={current} />
      <AdminTable
        columns={["Boost", "Listing", "Window", "Amount", "Status", "Ends", "Actions"]}
        empty={`None ${current}.`}
      >
        {items.map((p) => (
          <tr key={p.id} className="transition hover:bg-sand-50">
            <Td><strong>{p.kind}</strong></Td>
            <Td className="whitespace-nowrap text-ink-500">{p.listingId}</Td>
            <Td className="whitespace-nowrap">{p.days}d</Td>
            <Td className="whitespace-nowrap font-semibold">{formatKES(p.amount)}</Td>
            <Td><StatusChip status={p.status} /></Td>
            <Td className="whitespace-nowrap text-ink-500">{fmtDate(p.endsAt)}</Td>
            <Td><PromoButtons id={p.id} status={p.status} /></Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
