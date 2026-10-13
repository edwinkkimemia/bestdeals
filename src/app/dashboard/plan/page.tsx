import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { normalizePlan, PLAN_IDS } from "@/lib/plans";
import { getStore } from "@/lib/store";
import { PlanPanel } from "../shop/panels";

export const metadata = { title: "Plan & billing" };
export const dynamic = "force-dynamic";

export default async function PlanDash({ searchParams }: { searchParams: { plan?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/plan");
  const store = getStore();
  const owned = await store.listShopsByOwner(user.id).catch(() => []);
  const active = owned[0] ?? null;
  // ?plan=silver from /pricing preselects + highlights that plan in the checkout panel.
  const highlightPlan =
    searchParams.plan && (PLAN_IDS as readonly string[]).includes(searchParams.plan) ? searchParams.plan : undefined;
  return (
    <div>
      <h1 className="section-title flex items-center gap-2"><CreditCard className="h-6 w-6 text-brand-600" /> Plan & billing</h1>
      <p className="mt-1 text-sm text-ink-500">
        {active ? (
          <>Plan for <strong>{active.name}</strong> · <Link href={`/shops/${active.slug}`} className="link-bd">view storefront →</Link></>
        ) : (
          <>No shop yet — <Link href="/dashboard/shop" className="link-bd">create your storefront first →</Link></>
        )}
        {" · "}<Link href="/pricing" className="link-bd">Compare plans →</Link>
      </p>
      <div className="mt-4 max-w-2xl">
        <PlanPanel
          shops={owned.map((s) => ({ slug: s.slug, name: s.name, planId: normalizePlan((s as { planId?: unknown }).planId) }))}
          activeSlug={active?.slug ?? ""}
          highlightPlan={highlightPlan}
        />
      </div>
    </div>
  );
}
