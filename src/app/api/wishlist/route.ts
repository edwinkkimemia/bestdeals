import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

function key(userId: string): string {
  return `wishlist:${userId}`;
}

async function read(userId: string): Promise<string[]> {
  const v = ((await getStore().getSetting(key(userId)).catch(() => null)) as string[] | null) ?? [];
  return Array.isArray(v) ? v.slice(0, 500) : [];
}

/** Synced wishlist (signed-in). Guests keep localStorage; merged on sign-in via POST. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: await read(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : body.listingId ? [body.listingId] : [];
  const clean = [...new Set(ids.map((x: unknown) => String(x)).filter(Boolean))].slice(0, 500);
  if (body.merge) {
    const cur = await read(user.id);
    const merged = [...new Set([...cur, ...clean])].slice(0, 500);
    await getStore().setSetting(key(user.id), merged).catch(() => {});
    return NextResponse.json({ ok: true, items: merged });
  }
  const cur = await read(user.id);
  const merged = [...new Set([...cur, ...clean])].slice(0, 500);
  await getStore().setSetting(key(user.id), merged).catch(() => {});
  return NextResponse.json({ ok: true, items: merged });
}

export async function DELETE(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? (await req.json().catch(() => ({} as { id?: string }))).id;
  const cur = await read(user.id);
  const next = cur.filter((x) => x !== String(id));
  await getStore().setSetting(key(user.id), next).catch(() => {});
  return NextResponse.json({ ok: true, items: next });
}
