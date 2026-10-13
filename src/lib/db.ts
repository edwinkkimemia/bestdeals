/**
 * Prisma client singleton — optional at build time.
 * The marketplace runs in "demo mode" (curated seed data) when DATABASE_URL
 * is not configured, and switches to PostgreSQL once migrations have run.
 * This keeps `next build` green on machines without a database.
 */

let _db: unknown = null;
let _tried = false;
let _loadError: string | null = null;

export function db(): unknown | null {
  if (_tried) return _db;
  _tried = true;
  if (!process.env.DATABASE_URL) return null;
  try {
    // Plain require (NOT eval): the serverless function tracer only bundles
    // statically-analyzable dependencies. eval("require") was invisible to
    // tracing, so @prisma/client never shipped to production lambdas and
    // every request silently fell back to ephemeral demo memory.
    // Lazy (inside the function) so `next build` still works on machines
    // without `prisma generate` — a missing client fails here at runtime.
    const { PrismaClient } = require("@prisma/client") as {
      PrismaClient: new () => unknown;
    };
    _db = new PrismaClient();
  } catch (e) {
    _db = null;
    _loadError = (e as Error)?.message ?? String(e);
    // Loud: a broken client must never masquerade as a healthy database.
    console.error("[db] Prisma client failed to load — ephemeral demo fallback:", _loadError);
  }
  return _db;
}

/** Why the client failed to load (null when healthy or unconfigured). */
export function dbLoadError(): string | null {
  return _loadError;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
