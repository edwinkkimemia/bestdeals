import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listAudit } from "@/lib/audit";

/** Admin audit trail (persistent, settings-backed). */
export async function GET(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const limit = Math.min(500, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? "100") || 100));
  return NextResponse.json({ items: await listAudit(limit) });
}
