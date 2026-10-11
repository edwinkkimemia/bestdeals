import Link from "next/link";
import { BarChart3, Globe } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { getSellerAnalyticsReport } from "@/lib/analytics";
import { getSellerPlan, PLAN_ANALYTICS_DAYS } from "@/lib/plans";
import { Stat, RangeTabs, DailyChart } from "@/components/analytics-ui";

export const metadata = { title: "Listing analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SellerAnalyticsPage({ searchParams }: { searchParams: { days?: string } }) {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/analytics");
  const plan = await getSellerPlan(user.id);
  const maxDays = PLAN_ANALYTICS_DAYS[plan.planId];
  const options = [7, 30, 90].filter((n) => n <= maxDays);
  const d = Number(searchParams.days ?? String(maxDays));
  const days = options.includes(d) ? d : Math.max(...options);

  const report = await getSellerAnalyticsReport({ id: user.id, name: user.name }, days, maxDays);
  const ownedIds = new Set((await getStore().listListingsByOwner(user.id).catch(() => [])).map((l) => l.id));
  const maxViews = Math.max(1, ...report.perListing.map((p) => p.views));
  const convRate =
    report.funnel.views > 0 ? ((report.funnel.orders / report.funnel.views) * 100).toFixed(1) : "—";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title">Listing analytics</h1>
          <p className="mt-1 text-sm text-ink-500">
            How many people saw your products. One view = one visitor per product per 30 min — refreshes don&apos;t inflate it.
            {" "}Your {plan.planId} plan keeps {maxDays} days of history.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {plan.planId === "gold" ? (
              <a href={`/api/analytics/seller/export?days=${report.rangeDays}`} className="link-bd">Download CSV ↓</a>
            ) : (
              <Link href="/pricing" className="link-bd">Unlock 90-day history + CSV export with Gold →</Link>
            )}
          </div>
        </div>
        <RangeTabs base="/dashboard/analytics" current={report.rangeDays} options={options} />
      </div>

      {report.perListing.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-bold">No listings tracked yet</p>
          <p className="mt-1 text-sm text-ink-500">Publish a listing and share its link — views appear here in real time.</p>
          <Link href="/sell" className="btn-primary mt-4">Create a listing →</Link>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={`Views · last ${days} days`} value={report.totalViews.toLocaleString()} sub={`${report.uniqueViewers.toLocaleString()} unique viewers`} />
            <Stat label="Views · last 7 days" value={report.views7.toLocaleString()} />
            <Stat label="Enquiries · period" value={String(report.funnel.enquiries)} sub="buyer conversations started" />
            <Stat label="Orders · attributed" value={String(report.funnel.orders)} sub={`view → order ${convRate}%`} />
          </div>

          <div className="mt-3">
            <DailyChart daily={report.daily} label={`Daily views · last ${days} days`} />
          </div>

          <h2 className="mt-8 flex items-center gap-2 font-bold"><BarChart3 className="h-4 w-4 text-brand-600" /> Views per product ({report.perListing.length})</h2>
          <ul className="mt-3 space-y-2">
            {report.perListing.map((p) => (
              <li key={p.listingId} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={p.title}>
                    {ownedIds.has(p.listingId) ? (
                      <Link href={`/dashboard/listings/${p.listingId}`} className="link-bd">{p.title}</Link>
                    ) : (
                      p.title
                    )}
                  </p>
                  <p className="text-sm">
                    <strong>{p.views.toLocaleString()}</strong> <span className="text-ink-400">views · {p.uniques.toLocaleString()} viewers · {p.views7.toLocaleString()} this week</span>
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sand-100" role="img" aria-label={`${p.title}: ${p.views} views`}>
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(2, Math.round((p.views / maxViews) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ul>

          {report.topReferrers.length > 0 && (
            <>
              <h2 className="mt-8 flex items-center gap-2 font-bold"><Globe className="h-4 w-4 text-brand-600" /> Where viewers came from</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {report.topReferrers.map((r) => (
                  <li key={r.source} className="card flex items-center justify-between p-3 text-sm">
                    <span className="font-semibold">{r.source}</span>
                    <span className="text-ink-500">{r.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-8 text-xs text-ink-400">
            Aggregate counts only — no browsing identities are stored. Bots and your own rapid refreshes are excluded.
          </p>
        </>
      )}
    </div>
  );
}
