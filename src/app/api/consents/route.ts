import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** Marketing consent (opt-in/out). Server-enforced before bulk sends. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ consents: {} });
  const c = ((await getStore().getSetting(`consents:${user.id}`).catch(() => null)) as Record<string, boolean> | null) ?? {};
  return NextResponse.json({ consents: c });
}

export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const cur = ((await getStore().getSetting(`consents:${user.id}`).catch(() => null)) as Record<string, boolean> | null) ?? {};
  const next = { ...cur };
  for (const k of ["marketing", "price_alerts", "sms"]) {
    if (body[k] !== undefined) next[k] = Boolean(body[k]);
  }
  await getStore().setSetting(`consents:${user.id}`, next).catch(() => {});
  return NextResponse.json({ ok: true, consents: next });
}
