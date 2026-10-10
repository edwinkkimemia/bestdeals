import { NextRequest, NextResponse } from "next/server";
import { disputeSchema } from "@/lib/validators";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const REASONS: Record<string, string> = {
  not_received: "Item not received",
  not_as_described: "Not as described",
  damaged: "Damaged on arrival",
  wrong_item: "Wrong item sent",
  payment_issue: "Payment issue",
  other: "Other",
};

/** Buyer opens a dispute on an order. One open dispute per order. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "dispute"), { limit: 10, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form." }, { status: 400 });
  }
  const d = parsed.data;
  const store = getStore();
  const order = await store.getOrder(d.orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.phone !== d.phone) {
    return NextResponse.json({ error: "Phone doesn't match this order. Use the checkout phone." }, { status: 403 });
  }
  const existing = await store.getDisputeByOrder(d.orderId);
  if (existing && !["resolved_refund", "resolved_reject", "cancelled"].includes(existing.status)) {
    return NextResponse.json({ error: "A dispute is already open for this order.", id: existing.id }, { status: 409 });
  }
  const rec = await store.createDispute({
    orderId: d.orderId,
    buyerName: d.name,
    phone: d.phone,
    reason: REASONS[d.reason] ?? d.reason,
    details: d.details || undefined,
  });
  return NextResponse.json({ ok: true, id: rec.id });
}

/** Current dispute for an order (buyer + seller + admin can view). */
export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get("order");
  if (!orderId) return NextResponse.json({ error: "Missing order." }, { status: 400 });
  const d = await getStore().getDisputeByOrder(orderId);
  return NextResponse.json({ dispute: d });
}

/** Seller response. Must be signed in (seller side). */
export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { id, response } = body as { id?: string; response?: string };
  if (!id || !response || response.trim().length < 5) {
    return NextResponse.json({ error: "Write a response (min 5 characters)." }, { status: 400 });
  }
  await getStore().respondDispute(id, response.slice(0, 2000));
  return NextResponse.json({ ok: true });
}
