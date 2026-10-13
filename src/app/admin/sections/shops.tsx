import Link from "next/link";
import { Store } from "lucide-react";
import { normalizePlan } from "@/lib/plans";
import { getStore } from "@/lib/store";
import { AdminButtons, PlanConfirmButton } from "../actions";
import { AdminTable, Td, SectionHeading, SectionTabs } from "../table";
import { Badge } from "@/components/ui/badge";

const TABS = ["all", "verified", "pending"];

export async function ShopsSection({ status }: { status: string }) {
  const store = getStore();
  const tab = TABS.includes(status) ? status : "all";
  const all = await store.listShops();
  const items = tab === "all" ? all : all.filter((s) => (tab === "verified" ? s.verified : !s.verified));
  const owners = new Map((await store.listUsers().catch(() => [])).map((u) => [u.id, u.name]));
  const { pendingPlanKey } = await import("@/lib/plans");
  const pendings = new Map<string, { planId: string; amount: number }>();
  for (const s of items) {
    const p = (await store.getSetting(pendingPlanKey(s.slug)).catch(() => null)) as { planId?: string; amount?: number } | null;
    if (p?.planId) pendings.set(s.slug, { planId: p.planId, amount: p.amount ?? 0 });
  }
  return (
    <div>
      <SectionHeading icon={Store}>Shops ({items.length})</SectionHeading>
      <p className="mt-1 text-sm text-ink-500">
        Every seller shop: verify the business badge, check the plan, jump to the live storefront. Pending upgrades activate only when paid.
      </p>
      <SectionTabs base="/admin/shops" tabs={TABS} current={tab} />
      <AdminTable
        columns={["Shop", "Owner", "Plan", "Verified", "Location", "Storefront", "Payment", "Actions"]}
        empty={`No shops ${tab === "all" ? "yet" : tab}.`}
      >
        {items.map((s) => {
          const pending = pendings.get(s.slug);
          return (
            <tr key={s.slug} className="transition hover:bg-sand-50">
              <Td>
                <span className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-100 font-black text-ink-400">
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span>
                    <strong className="block">{s.name}</strong>
                    <span className="block text-xs text-ink-400">/shops/{s.slug}</span>
                  </span>
                </span>
              </Td>
              <Td>{s.ownerId ? owners.get(s.ownerId) ?? "owner" : <span className="text-ink-400">no owner</span>}</Td>
              <Td className="whitespace-nowrap">
                <span className="text-ink-700">{normalizePlan(s.planId)}</span>
                {pending && <Badge tone="amber" className="ml-1.5">awaiting {pending.planId} payment</Badge>}
              </Td>
              <Td>{s.verified ? <Badge tone="green">✓ verified</Badge> : <Badge>pending</Badge>}</Td>
              <Td className="whitespace-nowrap text-ink-500">{s.town}, {s.county}</Td>
              <Td>
                <Link href={`/shops/${s.slug}`} className="link-bd text-xs">View →</Link>
              </Td>
              <Td>
                {pending ? (
                  <PlanConfirmButton shopSlug={s.slug} planId={pending.planId} amount={pending.amount} />
                ) : (
                  <span className="text-xs text-ink-400">—</span>
                )}
              </Td>
              <Td><AdminButtons kind="shop" id={s.slug} extra={{ verified: s.verified }} /></Td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
