import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getPushPublicKey } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** VAPID public key the signed-in browser uses when subscribing to Web Push. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to enable notifications." }, { status: 401 });
  try {
    return NextResponse.json({ publicKey: await getPushPublicKey() });
  } catch {
    return NextResponse.json({ error: "Push notifications are not available right now." }, { status: 503 });
  }
}
