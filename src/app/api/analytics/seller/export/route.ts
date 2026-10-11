import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSellerAnalyticsReport } from "@/lib/analytics";
import { getSellerPlan, PLAN_ANALYTICS_DAYS, goldRequiredMessage } from "@/lib/plans";

export const dynamic = "force-dynamic";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Analytics CSV export — Gold plan only. Daily views per listing. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const plan = await getSellerPlan(user.id);
  if (plan.planId !== "gold") {
    return NextResponse.json({ error: goldRequiredMessage("Analytics CSV export"), code: "PLAN_GOLD" }, { status: 403 });
  }
  const d = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(d) ? d : 30;
  const report = await getSellerAnalyticsReport(
    { id: user.id, name: user.name },
    days,
    PLAN_ANALYTICS_DAYS.gold
  );
  const lines = ["listing_id,title,date,views,uniques"];
  for (const p of report.perListing) {
    for (const day of p.daily) {
      lines.push([p.listingId, p.title ?? p.listingId, day.date, day.views, day.uniques].map(csvCell).join(","));
    }
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=chap-analytics-${days}d.csv`,
    },
  });
}
