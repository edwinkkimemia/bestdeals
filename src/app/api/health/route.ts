import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getStorageHealth } from "@/lib/store";
import { isPaymentsLive } from "@/lib/payments";
import { isNotifyLive } from "@/lib/notify";
import { isRedisConfigured } from "@/lib/rate-limit";
import { isStrongSecret } from "@/lib/auth";
import { isS3Configured, isServerlessUploads } from "@/lib/storage";

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
    // db-fallback is durable only with a shared database — without
    // DATABASE_URL the staged bytes are per-instance memory like /tmp.
    uploads: isS3Configured() ? "s3" : isServerlessUploads() ? "db-fallback" : "local",
    uploadsDurable: isS3Configured() || !isServerlessUploads() || isDbConfigured(),
    authSecret: isStrongSecret() ? "strong" : "dev-default",
  });
}
