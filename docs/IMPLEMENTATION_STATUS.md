# Implementation status — honest accounting (updated 2026-10-13)

## Working now (demo mode, no credentials)

Public marketplace (home, shop, category, product/classified/service detail, shops, deals,
combined search with type tabs + counts incl. **live store listings** via `searchAll`,
cross-seller related rails), seller registration + dashboards, listing intake with
**hardened photo uploads** (EXIF-strip via sharp, 5MB/type checks, S3-ready) + moderation queue
with **granular reason codes** + bulk approve/reject, shop storefronts + plans + CSV template +
bulk job polling, cart/checkout with server-side totals + multi-seller suborders +
**M-Pesa + COD**, **stock decrement + idempotency**, **server cart** (`/api/cart`),
**server-persisted orders** with OTP-hardened lookup + buyer-cancel/seller-fulfil state machine,
enquiries seller inbox, reports with picker + 2-strike auto-hide, synced wishlist
(`/api/wishlist`), saved searches (`/api/saved-searches`), messaging with block/spam/read-all +
contact-reveal conversions, reviews with seller response/helpful + pending privacy,
disputes with ownership + SLA stamps + refund ledger, wallet Balance lite (`/api/wallet`),
renew/bump (7-day free) + TOP pins + Premium/VIP boosts, price hints/trends/niche
(`/api/insights`), invoices (`/api/invoices`), delivery matrix (`/api/delivery`),
newsletter double-opt-in + consents (`/api/consents`), audit trail (`/api/admin/audit`),
dynamic sitemap (store listings/shops/blog), extended `/api/health`
(payments/email/sms/redis/uploads/authSecret), tests 98 green.

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

- **M-Pesa Daraja**: real OAuth + STK HTTP + CheckoutRequestID→order/wallet mapping +
  amount-mismatch → failed + promo/plan activation on callback + refund ledger.
  Code-live; labelled NOT LIVE in UI until `MPESA_*` set and sandbox-tested.
- **Email/SMS**: Resend/SendGrid + Africa's Talking/Twilio adapters implemented;
  console-log only until `EMAIL_/SMS_` keys set. Queue (`src/lib/queue.ts`) retries;
  point it at BullMQ/Redis (`REDIS_URL`) at scale.
- **Object storage**: S3 SigV4 PUT implemented (`UPLOAD_DRIVER=s3` + `S3_*`);
  local-disk remains for single-server; serverless `/tmp` stays ephemeral by design.
- **Background jobs**: in-memory queue drains inline today; move to BullMQ workers
  for email bursts/image pipelines/expiry sweeps.
- **Order lookup**: OTP (`/api/otp` request/verify, 10-min code, 30-min window)
  implemented; legacy exact-phone still accepted during rollout — enforce OTP-only
  before scale.

## Known risks

- Demo backend resets on redeploy (by design; Postgres fixes it).
- Single-instance rate limiter (move to Redis at scale).
- Kenyan legal/tax review still required before launch.
