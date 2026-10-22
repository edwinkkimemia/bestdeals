# Deployment (Next.js-compatible hosting)

Recommended: Vercel, or any Node host / Docker (do **not** use classic PHP-only shared hosting).

## Steps

1. Provision PostgreSQL 15+ and Redis (optional, for queues/rate limits at scale).
2. Set env from `.env.example`: `DATABASE_URL`, `AUTH_SECRET` (32+ random chars), `ADMIN_EMAILS`, `ADMIN_PASSWORD` (initial admin password, change after first login), `NEXT_PUBLIC_SITE_URL=https://chap.co.ke`.
   - **Neon on Vercel:** install the Neon integration on the Vercel project. It injects `DATABASE_URL` (pooled, hostname contains `-pooler`) for the app and `DATABASE_URL_UNPOOLED` (direct) for Prisma migrations. `prisma/schema.prisma` reads both; do not point migrations at the pooled URL.
   - **Local Postgres:** set both variables to the same local URL (see `.env.example`).
3. Build & migrate (Vercel runs `npm run vercel-build`, which does all three):
   ```bash
   npm ci
   npx prisma migrate deploy
   npm run db:seed   # idempotent: blog, demo users/shops/listings + ADMIN_EMAILS promote/auto-create
   npm run build
   ```
   Demo accounts (`<name>@demo.chap.co.ke`, password `SEED_USER_PASSWORD`, default `ChapDemo123!`) are public credentials — fine for demos, never for real admins. Admins: every seed promotes `ADMIN_EMAILS` rows to `ADMIN` and auto-creates missing ones from `ADMIN_PASSWORD` (falls back to `SEED_USER_PASSWORD`); with neither set, sign up once at `/auth/signup` with an `ADMIN_EMAILS` address.
   > Without `DATABASE_URL` the store is in-memory demo mode and **every** account (admin included) vanishes on restart/redeploy — that is the #1 cause of "admin keeps getting deleted". Verify `/api/health` reports `"db": "configured"`.
4. Point `chap.co.ke` at the deployment; enforce HTTPS + HSTS.
5. Configure provider webhooks:
   - M-Pesa callback: `https://chap.co.ke/api/payments/mpesa-callback`
6. Verify: `/api/health`, Search Console, sitemap at `/sitemap.xml`.

## Production hardening

- `secure` cookies are automatic when `NODE_ENV=production`.
- Move the in-memory rate limiter to Redis (`REDIS_URL`) for multi-instance deploys.
- Serve images via CDN with responsive sizes; keep seller docs in a **private** bucket.
- Enable error monitoring (`SENTRY_DSN`) and structured logs.
