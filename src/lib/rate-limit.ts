/** Simple fixed-window rate limiter (per-process). Pair with Redis in production (see REDIS_URL). */
const buckets = new Map<string, { count: number; resetAt: number }>();

const PRUNE_EVERY = 500;
let sincePrune = 0;

function prune(now: number): void {
  sincePrune += 1;
  if (sincePrune < PRUNE_EVERY) return;
  sincePrune = 0;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: boolean; remaining: number; resetAfterMs: number } {
  const now = Date.now();
  prune(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetAfterMs: opts.windowMs };
  }
  if (b.count >= opts.limit) return { ok: false, remaining: 0, resetAfterMs: Math.max(0, b.resetAt - now) };
  b.count += 1;
  return { ok: true, remaining: opts.limit - b.count, resetAfterMs: Math.max(0, b.resetAt - now) };
}

/** Test hook: clear all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Standard RateLimit-* headers so clients back off correctly. */
export function rateLimitHeaders(
  limit: number,
  remaining: number,
  resetAfterMs: number
): Record<string, string> {
  return {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, remaining)),
    "RateLimit-Reset": String(Math.ceil(resetAfterMs / 1000)),
  };
}

export function clientKey(req: Request, suffix: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${ip}:${suffix}`;
}
