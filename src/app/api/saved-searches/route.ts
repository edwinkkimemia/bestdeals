import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { uid } from "@/lib/utils";

type Saved = { id: string; name: string; query: Record<string, unknown>; createdAt: string; lastAlertAt?: string };

function key(userId: string): string {
  return `saved_searches:${userId}`;
}

async function read(userId: string): Promise<Saved[]> {
  const v = ((await getStore().getSetting(key(userId)).catch(() => null)) as Saved[] | null) ?? [];
  return Array.isArray(v) ? v : [];
}

/** Saved searches + price alerts (Chap leapfrogs Jiji here). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await read(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const query = (body.query ?? {}) as Record<string, unknown>;
  const name = String(body.name || "Saved search").slice(0, 80);
  const cur = await read(user.id);
  if (cur.length >= 20) return NextResponse.json({ error: "Saved search limit reached (20)." }, { status: 409 });
  const rec: Saved = { id: uid("ss"), name, query, createdAt: new Date().toISOString() };
  await getStore().setSetting(key(user.id), [rec, ...cur].slice(0, 20)).catch(() => {});
  // Persist consent for alert emails.
  if (body.alerts && user.email) {
    const consents = ((await getStore().getSetting(`consents:${user.id}`).catch(() => null)) as Record<string, unknown> | null) ?? {};
    await getStore().setSetting(`consents:${user.id}`, { ...consents, price_alerts: true }).catch(() => {});
  }
  return NextResponse.json({ ok: true, item: rec });
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  const cur = await read(user.id);
  await getStore().setSetting(key(user.id), cur.filter((x) => x.id !== id)).catch(() => {});
  return NextResponse.json({ ok: true });
}
