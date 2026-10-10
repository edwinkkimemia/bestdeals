# Implementation status — honest accounting

## Working now (demo mode, no credentials)

Public marketplace (home, shop, category, product/classified/service detail, shops, deals,
combined search with type tabs + counts, cross-seller related rails), seller registration +
dashboards, listing intake with **real photo uploads** (`/uploads/*`) + moderation queue,
shop storefronts (seller-created shops render at `/shops/[slug]`) + plans + CSV template,
cart/checkout with server-side totals + multi-seller suborders, **server-persisted orders**
with phone/signed-in lookup, enquiries/messaging intake, reports, wishlist, SEO, tests.

**Trust & safety (new):**
- **Verification (mandatory before posting)**: sellers submit national ID/business permit + confirm the phone matching their account; admins review doc + number and approve. `/api/listings` and `/api/shops` reject unverified sellers (403 `NOT_VERIFIED`, fresh flag — never the sign-in token). Approval flips the ✓ badge and unlocks posting.
- **One verified number everywhere**: the confirmed phone snapshots onto every listing at posting time; WhatsApp ordering always uses the snapshot first, then the shop's approved contact — no number, no button.
- **Reviews**: order-linked reviews with server-computed ✓ Verified purchase badge
  (paid/delivered only), moderation before display, shown on listing + shop pages.
- **Disputes**: buyer opens with checkout-phone check, seller responds, admin resolves
  (refund → order cancelled + payment refunded; reject → seller wins). Full trail on the
  order page and admin queues.

**Persistence:** `src/lib/store.ts` — one typed interface, two backends. Every route
(users, listings, orders, payments, enquiries, reports, shops, verifications, reviews,
disputes) reads/writes through it. Demo backend is in-memory; **Prisma backend activates
automatically when `DATABASE_URL` is set** — no route changes needed.
Migration `prisma/migrations/0001_init` (36 tables incl. `Dispute`) applies with
`npx prisma migrate deploy`, then `npx prisma db seed`.

## Needs credentials / providers to go fully live

- **M-Pesa Daraja**: STK initiation + idempotent callback ledger implemented and
  wired to real order totals; labelled NOT LIVE until `MPESA_*` set and sandbox-tested.
- **Email/SMS/WhatsApp**: adapter logs to console until provider keys are set.
- **Object storage**: local-disk driver works for single-server; set `UPLOAD_DRIVER=s3`
  + `S3_*` for CDN/object storage on serverless (see `docs/providers.md`).
- **Background jobs** (emails, image processing, expiry): use BullMQ/Redis (`REDIS_URL`).
- **Order lookup hardening**: guest lookup is exact-phone today; add OTP before scale.

## Known risks

- Demo backend resets on redeploy (by design; Postgres fixes it).
- Single-instance rate limiter (move to Redis at scale).
- Kenyan legal/tax review still required before launch.
