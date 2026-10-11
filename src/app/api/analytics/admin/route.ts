import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getAdminAnalyticsReport } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Platform-wide analytics — admins only. Titles/sellers resolved for the top rows. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const d = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const days = [7, 30, 90].includes(d) ? d : 30;
  return NextResponse.json(await getAdminAnalyticsReport(days));
}
