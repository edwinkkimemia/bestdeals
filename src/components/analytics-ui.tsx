import Link from "next/link";
import type { DailyPoint, PlatformBreakdown } from "@/lib/analytics";

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

/** Web vs app view counts for the same report period. */
export function PlatformSplit({ platforms }: { platforms: PlatformBreakdown }) {
  const total = platforms.web.views + platforms.app.views;
  const pct = (n: number) =>
    total > 0 ? `${Math.round((n / total) * 100)}% of views` : "no views yet";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat
        label="Web views"
        value={platforms.web.views.toLocaleString()}
        sub={`${pct(platforms.web.views)} · ${platforms.web.uniques.toLocaleString()} unique visitors`}
      />
      <Stat
        label="App views"
        value={platforms.app.views.toLocaleString()}
        sub={`${pct(platforms.app.views)} · ${platforms.app.uniques.toLocaleString()} unique installs`}
      />
    </div>
  );
}

export function RangeTabs({
  base,
  current,
  options,
}: {
  base: string;
  current: number;
  options?: number[];
}) {
  const ranges = options ?? [7, 30, 90];
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Date range"
    >
      {ranges.map((d) => (
        <Link
          key={d}
          href={`${base}?days=${d}`}
          aria-current={current === d ? "true" : undefined}
          className={`chip ${current === d ? "!border-brand-600 !text-brand-700" : ""}`}
        >
          Last {d} days
        </Link>
      ))}
    </div>
  );
}

/** Zero-dependency daily bar chart (pure divs, server-safe). */
export function DailyChart({
  daily,
  label,
}: {
  daily: DailyPoint[];
  label: string;
}) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <div className="card p-5">
      <p className="font-bold">{label}</p>
      {daily.every((d) => d.views === 0) ? (
        <p className="mt-2 text-sm text-ink-500">
          No views in this period yet — share your listings to get traffic.
        </p>
      ) : (
        <div
          className="mt-4 flex items-end gap-1"
          role="img"
          aria-label={`${label} bar chart`}
        >
          {daily.map((d) => (
            <div
              key={d.date}
              className="group relative min-w-0 flex-1"
              title={`${d.date}: ${d.views} views · ${d.uniques} viewers`}
            >
              <div
                className="w-full rounded-t bg-brand-600/80 transition group-hover:bg-brand-600"
                style={{
                  height: `${Math.max(3, Math.round((d.views / max) * 120))}px`,
                }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[11px] text-white group-hover:block">
                {d.date.slice(5)} · {d.views} views
              </span>
            </div>
          ))}
        </div>
      )}
      {daily.length > 0 && (
        <p className="mt-2 text-xs text-ink-400">
          {daily[0].date} → {daily[daily.length - 1].date}
        </p>
      )}
    </div>
  );
}
