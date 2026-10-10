import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** Admin-only: approve/reject a pending review. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { id, approve } = body as { id?: string; approve?: boolean };
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  await getStore().setReviewStatus(id, approve === true ? "approved" : "rejected");
  return NextResponse.json({ ok: true });
}
