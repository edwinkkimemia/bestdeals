import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getAdminAnalyticsReport } from "@/lib/analytics";
import { Stat, RangeTabs, DailyChart } from "@/components/analytics-ui";

export const metadata = { title: "Admin analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: { days?: string } }) {
  const d = Number(searchParams.days ?? "30");
  const days = [7, 30, 90].includes(d) ? d : 30;
  const report = await getAdminAnalyticsReport(days);
  const maxTop = Math.max(1, ...report.topListings.map((t) => t.views));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title flex items-center gap-2"><BarChart3 className="h-6 w-6 text-brand-600" /> Product-view analytics ({report.totalViews.toLocaleString()})</h1>
          <p className="mt-1 text-sm text-ink-500">
            How people discover products across the marketplace — same counter sellers see, platform-wide.
          </p>
        </div>
        <RangeTabs base="/admin/analytics" current={days} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Views · last ${days} days`} value={report.totalViews.toLocaleString()} sub={`${report.uniqueViewers.toLocaleString()} unique viewers`} />
        <Stat label="Products viewed" value={String(report.viewedListings)} sub={`of ${report.catalogueSize} catalogue items`} />
        <Stat label="Top product views" value={(report.topListings[0]?.views ?? 0).toLocaleString()} sub={report.topListings[0]?.title?.slice(0, 40) ?? "—"} />
        <Stat label="Top source" value={report.topReferrers[0]?.source ?? "—"} sub={report.topReferrers[0] ? `${report.topReferrers[0].count.toLocaleString()} views` : "no data yet"} />
      </div>

      <div className="mt-3">
        <DailyChart daily={report.daily} label={`Daily product views · last ${days} days`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-bold">Most viewed products</h2>
          {report.topListings.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">No views recorded yet — views start counting as soon as listing pages are visited.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {report.topListings.map((t) => (
                <li key={t.listingId} className="card space-y-2 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      <strong>{t.title}</strong> <span className="text-ink-400">· {t.sellerName}</span>
                    </span>
                    <span className="shrink-0"><strong>{t.views.toLocaleString()}</strong> <span className="text-ink-400">· {t.uniques.toLocaleString()} viewers</span></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sand-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(2, Math.round((t.views / maxTop) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="font-bold">Top sellers by views</h2>
            {report.topSellers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">—</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.topSellers.map((s) => (
                  <li key={s.sellerName} className="card flex items-center justify-between p-3 text-sm">
                    <span><strong>{s.sellerName}</strong> <span className="text-ink-400">· {s.listings} product{s.listings === 1 ? "" : "s"} in top 15</span></span>
                    <span className="font-bold">{s.views.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="font-bold">Traffic sources</h2>
            {report.topReferrers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">—</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.topReferrers.map((r) => (
                  <li key={r.source} className="card flex items-center justify-between p-3 text-sm">
                    <span className="font-semibold">{r.source}</span>
                    <span className="text-ink-500">{r.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink-400">
              Aggregate only — visitor identities are never stored. Sellers see the same numbers for their own products at <Link href="/dashboard/analytics" className="link-bd">/dashboard/analytics</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
