# chap.co.ke — Kenya's Marketplace for Everything

**Find it. Sell it. Get the best deal.** Shopping, classifieds, business shops and local services in one mobile-first marketplace.

## Quick start (demo mode — no database needed)

```bash
npm install
npm run dev        # http://localhost:3000
```

Demo mode uses the curated catalogue in `src/data/catalog.ts`. Auth uses an in-memory store (dev only).

**Demo accounts:** password `ChapDemo123!` (or `SEED_USER_PASSWORD`). Use `admin@chap.co.ke` (or `ADMIN_EMAILS`) to get the ADMIN role and open `/admin`. Full seller/shop/buyer table: `docs/DEMO_LOGINS.md`.

## Production (PostgreSQL or Neon)

```bash
docker compose up -d db redis
cp .env.example .env   # fill DATABASE_URL + DATABASE_URL_UNPOOLED + AUTH_SECRET
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

On Vercel, install the Neon integration and connect it to the project. It sets
`DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct); `vercel-build` then
runs `prisma migrate deploy`, the seed and `next build` automatically. See
`docs/DEPLOY.md`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run lint` / `npm run typecheck` | Lint + strict type check |
| `npm test` | Unit/integration tests (node:test) |
| `npx prisma migrate dev` | Apply schema migrations |
| `npx prisma db seed` | Seed categories, plans, blog, demo users/shops/listings (idempotent) |

## Key routes

`/`, `/browse`, `/browse/[category]`, `/product/[slug]`, `/classifieds`, `/classifieds/[slug]`, `/shops`, `/shops/[slug]`, `/services`, `/services/[slug]`, `/deals`, `/sell`, `/pricing`, `/search`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/messages/new`, `/dashboard`, `/admin`, `/help`… (plus SEO `sitemap.xml`, `robots.txt`)

## Docs

- `docs/DEPLOY.md` — hosting, env, migrations
- `docs/providers.md` — M-Pesa Daraja, email/SMS, storage wiring
- `docs/BACKUP.md` — backup & recovery
- `docs/PRODUCTION_CHECKLIST.md` — launch gates
- `docs/IMPLEMENTATION_STATUS.md` — what works, what needs credentials
- `docs/DEMO_LOGINS.md` — demo sellers/shops/buyer emails + password + lockout fixes

## Principles

Trust before scale · Mobile before desktop · Free entry, paid growth · Real data only · Security by design.
