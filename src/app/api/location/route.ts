import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { KENYA_COUNTIES, resolveCounty } from "@/lib/kenya";

export const runtime = "nodejs";

const schema = z.object({ county: z.string().trim().max(60) });

/** Signed-in county preference (keeps location consistent across devices). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ county: null });
  const raw = await getStore().getSetting(`location:${user.id}`).catch(() => null);
  return NextResponse.json({ county: typeof raw === "string" ? raw : null });
}

export async function PUT(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to save your location." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a county." }, { status: 400 });

  const raw = parsed.data.county;
  const allKenya = raw.toLowerCase() === "all" || raw.toLowerCase() === "all kenya";
  const county = allKenya ? "all" : resolveCounty(raw);
  if (!allKenya && county === "all") {
    return NextResponse.json({ error: "That county isn't recognised." }, { status: 400 });
  }
  if (county !== "all" && !KENYA_COUNTIES.some((c) => c.county === county)) {
    return NextResponse.json({ error: "That county isn't recognised." }, { status: 400 });
  }

  await getStore().setSetting(`location:${user.id}`, county);
  return NextResponse.json({ ok: true, county });
}
