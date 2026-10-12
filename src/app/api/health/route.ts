import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getStorageHealth } from "@/lib/store";

/** Liveness + dependency checks for uptime monitors. No secrets leaked. */
export async function GET() {
  const health = await getStorageHealth().catch(() => null);
  return NextResponse.json({
    ok: true,
    app: "chap",
    time: new Date().toISOString(),
    db: isDbConfigured() ? "configured" : "demo-mode",
    storage: health?.mode ?? "unknown",
    reachable: health?.reachable ?? false,
    note: health?.note ?? null,
  });
}
