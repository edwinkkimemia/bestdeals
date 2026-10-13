import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

/** Double-opt-in confirm for newsletter. */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const store = getStore();
  const list = ((await store.getSetting("newsletter").catch(() => null)) as { email: string; token: string; verified: boolean; at: string }[] | null) ?? [];
  const hit = list.find((x) => x.token === token);
  if (!hit) return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  await store.setSetting("newsletter", list.map((x) => (x.token === token ? { ...x, verified: true } : x))).catch(() => {});
  return NextResponse.redirect(new URL("/?newsletter=confirmed", req.url), 303);
}
