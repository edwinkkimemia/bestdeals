import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getStorageHealth } from "@/lib/store";
import { isPaymentsLive } from "@/lib/payments";
import { isNotifyLive } from "@/lib/notify";
import { isRedisConfigured } from "@/lib/rate-limit";
import { isStrongSecret } from "@/lib/auth";

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
    payments: isPaymentsLive() ? "live" : "not-live",
    email: isNotifyLive("email") ? "live" : "log",
    sms: isNotifyLive("sms") ? "live" : "log",
    redis: isRedisConfigured() ? "configured" : "memory",
    uploads: (process.env.UPLOAD_DRIVER || "local") === "s3" ? "s3" : "local",
    authSecret: isStrongSecret() ? "strong" : "dev-default",
  });
}
