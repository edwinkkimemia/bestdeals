import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const maxDuration = 60;

/** Admin-only: (re)run the idempotent deploy seed (users, shops, listings, blog). */
export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  // Demo mode (no DATABASE_URL): seed the in-memory roster instead of Postgres.
  if (!process.env.DATABASE_URL) {
    const { ensureDemoUsers } = await import("@/lib/demo-users");
    const r = await ensureDemoUsers(getStore()).catch(() => ({ created: 0, total: 0 }));
    return NextResponse.json({ ok: true, demoMode: true, ...r });
  }
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
