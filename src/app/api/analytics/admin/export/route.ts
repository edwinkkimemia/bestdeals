import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getAdminAnalyticsReport } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Admin analytics CSV export (platform daily + top listings). */
export async function GET(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const d = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(d) ? d : 30;
  const report = await getAdminAnalyticsReport(days);
  const lines = ["listing_id,title,seller,views,uniques"];
  for (const t of report.topListings) {
    lines.push([t.listingId, t.title ?? "", t.sellerName ?? "", t.views, t.uniques].map(csvCell).join(","));
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=chap-admin-${days}d.csv` },
  });
}
