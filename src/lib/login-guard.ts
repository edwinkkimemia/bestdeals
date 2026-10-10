/**
 * Per-account sign-in guard: caps failed password attempts per email address,
 * on top of the existing per-IP rate limit. In-memory (per-process) like the
 * IP limiter — use Redis/keyed store in production (see REDIS_URL).
 */

const attempts = new Map<string, { count: number; resetAt: number; lockedUntil?: number }>();

export const LOGIN_GUARD = {
  maxAttempts: 5,
  windowMs: 15 * 60_000,
  lockMs: 15 * 60_000,
};

export function loginGuardKey(email: string): string {
  return email.trim().toLowerCase();
}

export function isAccountLocked(email: string, now = Date.now()): { locked: boolean; retryAfterSec?: number } {
  const b = attempts.get(loginGuardKey(email));
  if (!b) return { locked: false };
  if (b.resetAt <= now) {
    attempts.delete(loginGuardKey(email));
    return { locked: false };
  }
  if (b.lockedUntil && b.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  return { locked: false };
}

export function recordLoginFailure(email: string, now = Date.now()): { locked: boolean; remaining: number } {
  const key = loginGuardKey(email);
  let b = attempts.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + LOGIN_GUARD.windowMs };
    attempts.set(key, b);
  }
  b.count += 1;
  if (b.count >= LOGIN_GUARD.maxAttempts) {
    b.lockedUntil = now + LOGIN_GUARD.lockMs;
    return { locked: true, remaining: 0 };
  }
  return { locked: false, remaining: LOGIN_GUARD.maxAttempts - b.count };
}

export function clearLoginFailures(email: string): void {
  attempts.delete(loginGuardKey(email));
}

/** Test hook: reset all tracked attempts. */
export function resetLoginGuard(): void {
  attempts.clear();
}
