# Deployment (Next.js-compatible hosting)

Recommended: Vercel, or any Node host / Docker (do **not** use classic PHP-only shared hosting).

## Steps

1. Provision PostgreSQL 15+ and Redis (optional, for queues/rate limits at scale).
2. Set env from `.env.example`: `DATABASE_URL`, `AUTH_SECRET` (32+ random chars), `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL=https://chap.co.ke`.
3. Build & migrate (Vercel runs `npm run vercel-build`, which does all three):
   ```bash
   npm ci
   npx prisma migrate deploy
   npm run db:seed   # idempotent: blog, demo users/shops/listings; skips admin creation
   npm run build
   ```
   Demo accounts (`<name>@demo.chap.co.ke`, password `SEED_USER_PASSWORD`, default `ChapDemo123!`) are public credentials — fine for demos, never for real admins (claim those via signup with an `ADMIN_EMAILS` address).
4. Point `chap.co.ke` at the deployment; enforce HTTPS + HSTS.
5. Configure provider webhooks:
   - M-Pesa callback: `https://chap.co.ke/api/payments/mpesa-callback`
6. Verify: `/api/health`, Search Console, sitemap at `/sitemap.xml`.

## Production hardening

- `secure` cookies are automatic when `NODE_ENV=production`.
- Move the in-memory rate limiter to Redis (`REDIS_URL`) for multi-instance deploys.
- Serve images via CDN with responsive sizes; keep seller docs in a **private** bucket.
- Enable error monitoring (`SENTRY_DSN`) and structured logs.
