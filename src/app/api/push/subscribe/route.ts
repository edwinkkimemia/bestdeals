import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { savePushSubscription, removePushSubscription } from "@/lib/push";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(3000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20).max(500),
    auth: z.string().min(8).max(200),
  }),
});

const bodySchema = z.object({ subscription: subscriptionSchema });

/** Save this browser's push endpoint for the signed-in account. */
export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to enable notifications." }, { status: 401 });

  const rl = rateLimit(clientKey(req, `push:subscribe:${user.id}`), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many subscription attempts. Try again later." }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });

  await savePushSubscription(user.id, parsed.data.subscription, req.headers.get("user-agent"));
  return NextResponse.json({ ok: true });
}

/** Remove one browser subscription, or every device when no endpoint is sent. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim().slice(0, 3000) : "";
  const removed = await removePushSubscription(user.id, endpoint || undefined);
  return NextResponse.json({ ok: true, removed });
}
