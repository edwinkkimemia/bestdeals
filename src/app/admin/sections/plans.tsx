import { CreditCard } from "lucide-react";
import { getStore } from "@/lib/store";
import { auditPlanRows } from "@/lib/plans";
import { AdminButtons } from "../actions";
import { AdminTable, Td, SectionHeading, SectionTabs } from "../table";
import { Badge } from "@/components/ui/badge";

const TABS = ["all", "needs-upgrade"];

const planBadge = (planId: string) =>
  planId === "gold" ? (
    <Badge tone="amber">★ Gold</Badge>
  ) : planId === "silver" ? (
    <Badge tone="blue">Silver</Badge>
  ) : (
    <span className="text-xs text-ink-400">free</span>
  );

/** Plan-vs-listings audit: every account's live count against its effective plan. */
export async function PlansSection({ status }: { status: string }) {
  const tab = TABS.includes(status) ? status : "all";
  const store = getStore();
  const [users, shops, counts] = await Promise.all([
    store.listUsers().catch(() => []),
    store.listShops().catch(() => []),
    store.countLiveListingsByOwner().catch(() => []),
  ]);
  const rows = auditPlanRows(users, shops, counts);
  const items = (tab === "needs-upgrade" ? rows.filter((r) => r.needsUpgrade) : rows).sort(
    (a, b) => b.liveCount - a.liveCount
  );
  const needCount = rows.filter((r) => r.needsUpgrade).length;
  return (
    <div>
      <SectionHeading icon={CreditCard}>Plan audit ({items.length}{tab === "all" ? ` accounts · ${needCount} need upgrade` : " to fix"})</SectionHeading>
      <p className="mt-1 text-sm text-ink-500">
        Live listings per account (rejected/sold/expired don&apos;t count): ≤5 fits Free, 6–30 needs Silver, 31+ needs Gold.
        Assign upgrades only — accounts are never auto-downgraded. A seller has one plan: it lands on the first owned shop when there is one (storefront earns its checkmark), else the personal seller plan.
      </p>
      <SectionTabs base="/admin/plans" tabs={TABS} current={tab} />
      <AdminTable
        columns={["Seller", "Live", "Effective", "Expected", "Status", "Lands on", "Actions"]}
        empty={tab === "needs-upgrade" ? "Everyone fits their plan ✓" : "No accounts."}
      >
        {items.map((r) => (
          <tr key={r.userId} className="transition hover:bg-sand-50">
            <Td>
              <strong className="block">{r.name}</strong>
              <span className="block text-xs text-ink-400">{r.email}</span>
            </Td>
            <Td className="whitespace-nowrap font-semibold">{r.liveCount}</Td>
            <Td>{planBadge(r.effectivePlan)}</Td>
            <Td>{planBadge(r.expectedPlan)}</Td>
            <Td>
              {r.needsUpgrade ? (
                <Badge tone="amber">needs {r.expectedPlan}</Badge>
              ) : (
                <Badge tone="green">fits ✓</Badge>
              )}
            </Td>
            <Td className="whitespace-nowrap text-xs text-ink-500">
              {r.target.kind === "shop" ? `shop: ${r.target.name}` : "personal plan"}
            </Td>
            <Td>
              {r.needsUpgrade ? (
                <AdminButtons kind="planaudit" id={r.userId} />
              ) : (
                <span className="text-xs text-ink-400">—</span>
              )}
            </Td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
