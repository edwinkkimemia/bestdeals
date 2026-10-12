import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(["close", "hide"]).default("close"),
});

/**
 * Admin-only report handling:
 * - close: report dealt with, listing untouched.
 * - hide: close + hide the reported listing (audited) in one click.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide id + action (close|hide)." }, { status: 400 });
  const store = getStore();
  const all = await store.listReports();
  const report = all.find((r) => r.id === parsed.data.id);
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  if (parsed.data.action === "hide" && report.listingId) {
    const listing = await store.getListing(report.listingId);
    if (listing) {
      await store.setListingStatus(
        report.listingId,
        "hidden",
        user.id,
        `Hidden from report ${report.id}: ${report.reason}`.slice(0, 500)
      );
    }
  }
  await store.setReportStatus(parsed.data.id, "closed");
  return NextResponse.json({ ok: true, action: parsed.data.action });
}
