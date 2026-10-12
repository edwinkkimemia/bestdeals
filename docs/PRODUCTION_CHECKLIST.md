# Production-readiness checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all green
- [ ] `DATABASE_URL` + migrations + seed applied; `/api/health` reports `configured`
- [ ] `AUTH_SECRET` rotated; admin accounts via `ADMIN_EMAILS`; least-privilege roles verified
- [ ] Listings: create → pending → approve/hide with reason + audit (tested as admin)
- [ ] Checkout: stock re-validation, multi-seller suborders, COD + M-Pesa sandbox STK + callback verified
- [ ] Refund/dispute workflow dry-run; failed payments excluded from revenue
- [ ] Uploads: type/size enforced; docs in private bucket
- [ ] Rate limits moved to Redis; spam/abuse drills (enquiry flood, duplicate listings)
- [ ] SEO: titles/meta/canonical/sitemap/robots/OG + JSON-LD spot-checked; no private pages indexed
- [ ] Kenyan legal + tax review (Data Protection Act, consumer protection, e-transactions)
- [ ] Monitoring (Sentry), structured logs, backup restore drill logged
