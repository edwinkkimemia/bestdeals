import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { normalizePlan, PLAN_IDS } from "@/lib/plans";
import { getStore } from "@/lib/store";
import { PlanPanel } from "../shop/panels";
import { SellerPlanPanel } from "./seller-panel";

export const metadata = { title: "Plan & billing" };
export const dynamic = "force-dynamic";

export default async function PlanDash({ searchParams }: { searchParams: { plan?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/plan");
  const store = getStore();
  const owned = await store.listShopsByOwner(user.id).catch(() => []);
  const fresh = await store.findUserById(user.id).catch(() => null);
  const personalPlan = normalizePlan(fresh?.planId);
  const active = owned[0] ?? null;
  // ?plan=silver from /pricing preselects + highlights that plan in the checkout panels.
  const highlightPlan =
    searchParams.plan && (PLAN_IDS as readonly string[]).includes(searchParams.plan) ? searchParams.plan : undefined;
  return (
    <div>
      <h1 className="section-title flex items-center gap-2"><CreditCard className="h-6 w-6 text-brand-600" /> Plan & billing</h1>
      <p className="mt-1 text-sm text-ink-500">
        {active ? (
          <>One plan for <strong>{active.name}</strong> covers your storefront and all its listings · <Link href={`/shops/${active.slug}`} className="link-bd">view storefront →</Link></>
        ) : (
          <>No shop yet — your personal seller plan covers your listings, or <Link href="/dashboard/shop" className="link-bd">create a storefront →</Link></>
        )}
        {" · "}<Link href="/pricing" className="link-bd">Compare plans →</Link>
      </p>
      <div className="mt-4 grid max-w-2xl items-start gap-3">
        {active ? (
          <PlanPanel
            shops={owned.map((s) => ({ slug: s.slug, name: s.name, planId: normalizePlan((s as { planId?: unknown }).planId) }))}
            activeSlug={active.slug}
            highlightPlan={highlightPlan}
          />
        ) : (
          <SellerPlanPanel planId={personalPlan} highlightPlan={highlightPlan} />
        )}
      </div>
    </div>
  );
}
