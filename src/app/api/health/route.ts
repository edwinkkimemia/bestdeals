import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";

/** Liveness + dependency checks for uptime monitors. No secrets leaked. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "chap",
    time: new Date().toISOString(),
    db: isDbConfigured() ? "configured" : "demo-mode",
  });
}
