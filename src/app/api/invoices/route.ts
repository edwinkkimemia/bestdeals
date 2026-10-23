import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listInvoicesForAdmin, listInvoicesForOwner } from "@/lib/invoices";

export const dynamic = "force-dynamic";

/** My invoices (plans + promotions). Admin sees all via ?all=1. */
export async function GET(req: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const all = new URL(req.url).searchParams.get("all") === "1";
  if (all) {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
    return NextResponse.json({ items: await listInvoicesForAdmin() });
  }
  return NextResponse.json({ items: await listInvoicesForOwner(user.id) });
}
