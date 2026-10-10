# chap.co.ke — Kenya's Marketplace for Everything

**Find it. Sell it. Get the best deal.** Shopping, classifieds, business shops and local services in one mobile-first marketplace.

## Quick start (demo mode — no database needed)

```bash
npm install
npm run dev        # http://localhost:3000
```

Demo mode uses the curated catalogue in `src/data/catalog.ts`. Auth uses an in-memory store (dev only).

**Demo accounts:** sign up with any email. Use `admin@chap.co.ke` (or `ADMIN_EMAILS`) to get the ADMIN role and open `/admin`.

## Production (PostgreSQL)

```bash
docker compose up -d db redis
cp .env.example .env   # fill DATABASE_URL + AUTH_SECRET
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run lint` / `npm run typecheck` | Lint + strict type check |
| `npm test` | Unit/integration tests (node:test) |
| `npx prisma migrate dev` | Apply schema migrations |
| `npx prisma db seed` | Seed counties, categories, plans, coupons |

## Key routes

`/`, `/shop`, `/shop/[category]`, `/product/[slug]`, `/classifieds`, `/classifieds/[slug]`, `/shops`, `/shops/[slug]`, `/services`, `/services/[slug]`, `/deals`, `/sell`, `/pricing`, `/search`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/messages/new`, `/dashboard`, `/admin`, `/help`… (plus SEO `sitemap.xml`, `robots.txt`)

## Docs

- `docs/DEPLOY.md` — hosting, env, migrations
- `docs/providers.md` — M-Pesa Daraja, email/SMS, storage wiring
- `docs/BACKUP.md` — backup & recovery
- `docs/PRODUCTION_CHECKLIST.md` — launch gates
- `docs/IMPLEMENTATION_STATUS.md` — what works, what needs credentials

## Principles

Trust before scale · Mobile before desktop · Free entry, paid growth · Real data only · Security by design.
