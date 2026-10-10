import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/** Single order — visible to the checkout phone owner or the signed-in buyer. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(clientKey(req, "order:get"), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const order = await getStore().getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const user = await currentUser().catch(() => null);
  const ok =
    (phone && order.phone === phone) ||
    (user && (order.buyerId === user.id));
  if (!ok) return NextResponse.json({ error: "Not your order." }, { status: 403 });
  return NextResponse.json({ order });
}
