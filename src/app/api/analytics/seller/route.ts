import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSellerAnalyticsReport } from "@/lib/analytics";
import { getSellerPlan, PLAN_ANALYTICS_DAYS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Seller analytics: views for the seller's own listings.
 * History depth follows the plan — Free 7 days, Silver 30, Gold 90.
 * Covers store listings (ownerId match) plus demo-catalogue listings with the
 * same seller name, so sellers see real numbers from day one in demo mode.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const d = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(d) ? d : 30;
  const plan = await getSellerPlan(user.id);
  const report = await getSellerAnalyticsReport(
    { id: user.id, name: user.name },
    days,
    PLAN_ANALYTICS_DAYS[plan.planId]
  );
  return NextResponse.json({ ...report, planId: plan.planId });
}
