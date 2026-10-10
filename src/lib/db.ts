/**
 * Prisma client singleton — optional at build time.
 * The marketplace runs in "demo mode" (curated seed data) when DATABASE_URL
 * is not configured, and switches to PostgreSQL once migrations have run.
 * This keeps `next build` green on machines without a database.
 */

let _db: unknown = null;
let _tried = false;

export function db(): unknown | null {
  if (_tried) return _db;
  _tried = true;
  if (!process.env.DATABASE_URL) return null;
  try {
    // Lazy require so builds without `prisma generate` still succeed.
    const { PrismaClient } = eval("require")("@prisma/client") as {
      PrismaClient: new () => unknown;
    };
    _db = new PrismaClient();
  } catch {
    _db = null;
  }
  return _db;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
