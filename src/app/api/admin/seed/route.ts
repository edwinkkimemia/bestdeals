import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export const maxDuration = 60;

/** Admin-only: (re)run the idempotent deploy seed (users, shops, listings, blog). */
export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  try {
    const { runSeed } = await import("../../../../../prisma/seed");
    const counts = await runSeed();
    if (counts.skipped) {
      return NextResponse.json({ ok: false, error: "No database reachable — check DATABASE_URL." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Seed failed: ${(e as Error)?.message?.slice(0, 300) ?? "unknown error"}` },
      { status: 500 }
    );
  }
}
