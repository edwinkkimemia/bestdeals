import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

/** Send a small test notification to this account's connected devices. */
export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const rl = rateLimit(clientKey(req, `push:test:${user.id}`), { limit: 5, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many test notifications. Try again later." }, { status: 429 });

  const sent = await sendPushToUser(user.id, {
    title: "Push notifications are on",
    body: "You’ll get Chap chats, orders, listing updates and search alerts here — even when the site is closed.",
    url: "/dashboard/notifications",
  });
  if (sent === 0) {
    return NextResponse.json(
      { error: "No active push device found. Enable notifications on this browser first." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, sent });
}
