# TODO — chap.co.ke incomplete features audit (2026-10-12)

> UPDATE 2026-10-13: code fixes landed — `typecheck / test (98) / lint / build` green.
> Code-complete; only external keys + legal review remain (marked `[keys]`).
> See `docs/IMPLEMENTATION_STATUS.md` + new routes: `/api/otp`, `/api/cart`,
> `/api/wishlist`, `/api/saved-searches`, `/api/wallet`, `/api/insights`,
> `/api/delivery`, `/api/invoices`, `/api/consents`, `/api/admin/audit`,
> `/api/analytics/admin/export`, `/api/listings/resolve`, renew `PATCH
> /api/listings/[id] {action:renew}`.

> Generated from code audit of `src/`, `prisma/schema.prisma`, `.env.example`, `docs/IMPLEMENTATION_STATUS.md`.
> Status key: `[ ]` not started / incomplete, `[~]` partially works (demo/stub), `[x]` done.
> Every item has file evidence — fix until acceptance criteria pass + `lint / typecheck / test / build` green.

## 0. Launch blockers (do first)

- [ ] Postgres as default: set `DATABASE_URL`, run `prisma migrate deploy + db seed`, verify `/api/health` → `configured`. Today demo in-memory resets on restart (`src/lib/store.ts:1989-2001`, `src/lib/db.ts:3-5`).
- [ ] Rotate `AUTH_SECRET` (currently falls back to `dev-only-secret…` in `src/lib/auth.ts:8-11`, `src/lib/auth-tokens.ts:5-8`). Add startup fail if default in production.
- [ ] Verify JWT in `middleware.ts:5-20` (currently only checks cookie existence, never verifies signature; forged cookie passes).
- [ ] Move rate-limit + login-guard to Redis (`src/lib/rate-limit.ts:1-17`, `src/lib/login-guard.ts:1-6` — both in-memory, per-process). Add `REDIS_URL`, BullMQ worker.
- [ ] Wire S3 object storage (`src/app/api/upload/route.ts:39-44` returns `501` when `UPLOAD_DRIVER=s3`; `src/lib/storage.ts:10-18` local-disk only, ephemeral on Vercel `/tmp`).
- [ ] Implement real Daraja OAuth + STK HTTP (`src/lib/payments.ts:52-57` returns fake `STK-${orderId}`, no HTTP). Keep UI labelled NOT LIVE until sandbox-tested (`docs/providers.md`).

## 1. Payments / Billing `[~] stub`

Evidence: `src/lib/payments.ts:32-57`, `src/app/api/payments/initiate/route.ts:13-52`, `src/app/api/payments/mpesa-callback/route.ts:10-32`, `src/app/checkout/page.tsx:32,104-110`, `src/app/api/orders/route.ts:100,112`, `.env.example:26-36`.

- [ ] Daraja: OAuth → STK push with `Shortcode/Passkey/Timestamp/Password/Phone/Amount/CallbackURL`; persist `CheckoutRequestID → orderId|promoId|planId` map.
- [ ] Callback: verify signature/IP allowlist, map `MerchantRequestID` correctly (today `payments.ts:91` uses it as `orderRef` but callback looks up `getOrder(v.orderRef)` — will miss), handle `amount mismatch → failed + alert`, idempotent on `providerRef` unique.
- [ ] Fix `PUT /api/payments/initiate:33-52` — currently never updates order status; remove or wire to order transition `pending → paid`.
- [ ] Checkout UI: M-Pesa phone input + STK flow + polling/reconcile job. Today hardcoded `paymentMethod=cod`, `?pay=cod` (`checkout/page.tsx:72`).
- [ ] Delivery fees: replace hardcoded `{standard:250, express:500, pickup:0}` (`checkout/page.tsx:13,38` + duplicate in `orders/route.ts:37`) with per-county/shop matrix + admin setting.
- [ ] Cards: either implement `CARD_PROVIDER` or remove option (today `Card payments are not available yet`).
- [ ] Plans/boosts: `src/app/api/shops/plan/route.ts:42-67` activates plan before payment (`Demo billing`); `src/app/api/promotions/route.ts:57-66` never auto-activates on payment. Add webhook → activate/downgrade, invoices, renewal reminders, grace period, prorate. Downgrade sweep for over-limit listings.
- [ ] Refunds/reversals: `src/app/api/admin/disputes/route.ts:1-28` only flips local status, no Daraja reversal, no `LedgerEntry`/`Refund` write.
- [ ] Vouchers/discounts/tax engine: `discount` always 0, no coupon codes.
- [ ] Tests: add `tests/payments.test.ts` — sandbox STK, callback idempotency, duplicate receipt, amount mismatch, promo/plan activation.

## 2. Notifications / Newsletter `[~] console-only`

Evidence: `src/lib/notify.ts:11-21`, `src/app/api/newsletter/route.ts:9-10`, `docs/providers.md:19`.

- [ ] Implement `EMAIL_PROVIDER` (Resend/SendGrid) + `SMS_PROVIDER` (Africa's Talking/Twilio) adapters + WhatsApp provider. Today all `console.log`, `queued:true` is misleading.
- [ ] Queue: BullMQ/Redis worker for emails/SMS, retry + backoff; don't `await sendNotification` inline in checkout/chat.
- [ ] Auth emails: verify-link + password-reset never arrive in demo (`signup/route.ts:46-55`, `auth/email/request:20-25`). Add resend + expiry + rate-limit.
- [ ] Newsletter: persist to DB + double-opt-in + unsubscribe + `Consent` check. Today only `console.log` + redirect, despite `Consent` model existing (`schema.prisma:95`).
- [ ] Consent enforcement: check server `consents` table before bulk send; add `/api/consents` opt-out endpoint.
- [ ] Tests: provider adapter + queue + consent-gate tests.

## 3. Storage / Uploads `[~] local-only`

Evidence: `src/app/api/upload/route.ts:28-44`, `src/lib/storage.ts`, `src/app/api/verify/route.ts:38-43`.

- [ ] S3 SDK: public prefix (product images → CDN) + private prefix (ID docs → signed URLs, encryption, bucket policy). Satisfy `docs/providers.md:23`, `PRODUCTION_CHECKLIST:9`.
- [ ] Hardening: virus scan, EXIF strip, resize/dimensions, NSFW check. Today only type/size/count (`JPG/PNG/WebP ≤5MB ≤8`).
- [ ] Verify `docPath.startsWith(private:)` — today trusts client string without proving file exists/owned/scanned.
- [ ] Private doc read: audit `src/app/api/admin/verifications/[id]/doc/route.ts:8` auth; add audit log.
- [ ] Watermark cache: `.data/wmcache` ephemeral, no CDN (`src/lib/storage.ts:25-28`). Move to persistent cache/CDN.
- [ ] Add `DELETE /api/upload`, upload/storage driver tests (type/size/auth/501/ephemeral).

## 4. Auth / Verification / Security `[~] partial`

Evidence: `middleware.ts`, `src/lib/auth.ts`, `src/app/api/orders/[id]/route.ts:7-20`, `src/app/api/disputes/route.ts:47-64`, `src/app/api/conversations/route.ts:42-47`, `src/app/api/admin/moderate/route.ts:28`.

- [ ] Session: sliding refresh, revoke list, `secure/httpOnly/sameSite` audit; stolen cookie valid 7d today (`auth.ts:30-36`).
- [ ] Guest order/chat lookup: exact-phone in `?phone=` + `localStorage bd_phone` is spoofable, leaks in logs/history (`orders/page.tsx:61-75`, `conversations/route.ts:62-71`). Add OTP via SMS before scale (`IMPLEMENTATION_STATUS:36` admits).
- [ ] Ownership: `GET /api/disputes?order=` leaks details with only orderId; `PATCH /api/disputes` lets any signed-in user respond (`:55-64`); `GET /api/reviews?order=` leaks pending; `POST /api/conversations` matches seller by display-name (`users.find(u=>u.name==seller)`) — collision/impersonation. Add owner/shop/admin checks + signed links.
- [ ] KYC: manual ID+phone only (`verify/route.ts`, `kyc.ts`, `gate.ts`). No OCR/liveness vendor (e.g. SmileID), no appeal/SLA, individual verification doesn't verify shops, no re-verify on phone change.
- [ ] Admin RBAC: only `ADMIN` via `ADMIN_EMAILS`; no moderator role, least-privilege. Demo catalogue IDs bypass with only `console.log[audit]` (`moderate/route.ts:28`); no persistent `AuditLog` write despite model.
- [ ] Brute-force: no CAPTCHA/2FA/device fingerprint; add tests for lockout, JWT forgery, phone-spoof.

## 5. Search / Discovery `[~] static index`

Evidence: `src/lib/search.ts:61-128`, `src/data/catalog.ts`, `src/data/bulk-listings.ts:2-16`, `src/app/sitemap.ts:37-43`, `src/app/api/search/suggest/route.ts:4-7`.

- [ ] Index Prisma seller listings, not just static `LISTINGS` (100 = 12 curated + 88 bulk). Today seller store listings invisible in search/suggest/sitemap.
- [ ] Suggest: include store titles, typo/fuzzy (trigram), popularity. Today static titles + 6 hardcoded cats.
- [ ] Ranking: replace `shuffleFeaturedFirst + Math.random` per request (`search.ts:104-118`) with deterministic score + personalization + saved-search alerts wiring (`SavedSearch` model unused in UI).
- [ ] Sitemap: include store listings/shops/blog posts; exclude private/filter URLs.
- [ ] Scrub fictional `0700-000-xxx` demo phones + Unsplash images before prod seed (`bulk-listings.ts:16`, `catalog.ts:84,100-101`).
- [ ] Postgres FTS migration + pagination/suggest integration tests.

## 6. Cart / Orders / Checkout `[~] COD-only, no stock decrement`

Evidence: `src/components/cart-provider.tsx:17-51`, `src/app/checkout/page.tsx:29-72`, `src/app/api/orders/route.ts:52-111`.

- [ ] Server cart: today `localStorage bd_cart_v1` only, filters out seller listings (`filter(getListing(l.id))` drops `store.getListing`), so seller items show `Nothing to check out`. Add server cart, merge on login, cross-device sync, qty caps per listing.
- [ ] Persist `instructions` field (registered in form `:32` but never sent/stored).
- [ ] Stock: never decremented/reserved — oversell risk. Add transactional decrement + reservation + idempotency key (double-click creates 2 orders today).
- [ ] State machine: add `PATCH /api/orders/[id]` (buyer cancel/edit, seller confirm/pack/ship/deliver, admin adjust) + tracking + returns. Today only `GET+POST` / `GET`.
- [ ] Lookup: OTP + pagination + filters; remove PII from URL; dual `localStorage bd_orders_v1` vs server source-of-truth cleanup.
- [ ] Commission: `COMMISSION_BPS_DEFAULT` hardcoded (`orders/route.ts:5,78`); move to admin setting + per-category rules (`CommissionRule` model unused).
- [ ] Tests: stock-decrement concurrency, idempotency, multi-seller suborders + commission.

## 7. Messaging / Enquiries / Disputes / Reviews `[~] intake-only`

Evidence: `src/app/dashboard/messages/*.tsx`, `src/components/chat-composer.tsx:1-176`, `src/app/api/conversations/[id]/route.ts:25-45`, `src/app/api/enquiries/route.ts:7-15`, `src/app/api/disputes/route.ts`, `src/app/api/reviews/route.ts:11-61`.

- [ ] Chat: block/mute/delete/leave, mark-read endpoint (exists in store `store.ts:949` but no route), edit/delete messages, attachments, pagination, realtime (poll only today), per-convo throttle, `2000 char` server-enforced. `Abusive users can be blocked` text (`messages/[id]:164`) has no API.
- [ ] Enquiries/reports: `POST`-only orphan logs; add seller inbox `GET`, link enquiry → conversation, spam flood tests.
- [ ] Disputes: evidence upload, SLA/deadline + auto-escalate, buyer-cancel path, timeline pagination, notifications on resolve. Notify on `resolved_refund/reject`.
- [ ] Reviews: author edit/delete, seller response, photos, helpful votes, admin pending queue API (today admin reads store directly), close `?order=` pending leak. Keep order-linked `Verified purchase` (strength vs Jiji) but add phone-gated path for COD/contact_seller.
- [ ] Tests: conversations/disputes/reviews ownership, spam, duplicate-review `409`.

## 8. Seller / Shops / Subscriptions `[~] no recurring billing`

Evidence: `src/app/api/shops/route.ts:10-52`, `src/app/api/shops/plan/route.ts:42-77`, `src/app/api/shops/staff/route.ts:22-58`, `src/app/api/listings/bulk/route.ts:18-108`, `src/lib/referrals.ts:3-48`, `src/app/dashboard/shop/panels.tsx:96-141`.

- [ ] Recurring billing (M-Pesa/Card) + invoices + renewal reminders + grace/downgrade sweep. Today `Billing records… live here` is text-only.
- [ ] Shop lifecycle: `DELETE` (close), transfer ownership, slug rename. Today `GET/POST/PATCH` only.
- [ ] Staff: invite-email accept flow, granular permissions (owner/staff only today), permission audit.
- [ ] Bulk CSV: async job with progress, per-row image upload, error report. Today synchronous, Gold-only, `limit 5/hr`, `Flagged term — submit manually`.
- [ ] Referrals: opaque codes (today enumerable `?ref=userId`), fraud (IP/device), expiry/multi-level, `POST` create; reward stays `qualified` if no active listing (`referrals.ts:32-33`) — add retry cron.
- [ ] Verification loop: business auto-verifies shops (`kyc.ts:14-18`) but individuals don't; unify + re-verify on phone change.
- [ ] Tests: staff/bulk/plan-billing/downgrade.

## 9. Admin / Moderation / Analytics `[~] pages read store directly`

Evidence: `src/app/api/admin/moderate/route.ts:23-29`, `src/app/admin/[section]/page.tsx:80,125`, `src/lib/analytics.ts:58-400`, `src/app/api/analytics/*/route.ts`.

- [ ] Moderate all listings (today 100 demo IDs are no-op `console.log`, `aren't listed` in queues). Unify demo+store queue, persistent `AuditLog` + `ModerationAction` writes, reason + audit.
- [ ] Admin APIs: add `GET` lists / `PATCH` status for users/shops/verifications/reports/reviews/disputes (today mostly `POST`-only, pages read `store` server-side — breaks on multi-instance). Add bulk approve/reject, suspend/appeal.
- [ ] Analytics: move from in-memory (`MEMORY_CAP 50k`, per-process dedup `ANALYTICS_DEDUP_MS 30m`) to Postgres + Redis dedup; fix attribution (`orders=suborders.some(seller==user.name)` name-string match — use `ownerId/shopId`); add revenue/orders-by-status, `catalogueSize` dynamic, `topReferrers` full URL.
- [ ] Exports: admin CSV export (only seller-Gold has it), scheduled reports; auth on `/api/analytics/track` (spam-able today), bot filter audit.
- [ ] Seed: split demo catalogue vs prod seed; `in-memory demo mode resets on restart` warning (`[section]/page.tsx:125`).
- [ ] Tests: moderation/dispute-resolve/promo-sweep integration.

## 10. SEO / Infra / Jobs / Observability `[ ] missing`

Evidence: `IMPLEMENTATION_STATUS:35`, `.env.example:39-40`, `src/app/sitemap.ts`, `src/app/api/health/route.ts:6-17`, `docs/BACKUP.md`, `docs/DEPLOY.md`.

- [ ] Jobs: BullMQ workers for emails, image processing, expiry, funnel. `sweepExpiredPromotions` is lazy (`store.ts:265` — expired stays `active` until read). Add cron.
- [ ] Persistence: `storeRead` fallback (`store.ts:1977-1987 console.warn`) hides DB outages as zeros — add alerting.
- [ ] SEO: dynamic sitemap (store listings/shops/blog), `robots.ts`, canonical/OG/JSON-LD audit, no private pages indexed (`dashboard/analytics`, `admin/*` already `noindex` — verify).
- [ ] Observability: init Sentry (`SENTRY_DSN` empty), structured logs (replace `console.log`), extend `/api/health` with Redis/S3/Daraja checks, uptime monitor.
- [ ] Backup: nightly logical backup cron + restore drill logged (`BACKUP.md:6` unproven).
- [ ] Config: move hardcoded `COMMISSION_BPS`, `PLAN_LISTING_LIMITS`, `REFERRAL_REWARD`, `SYNONYMS`, `BOT_RE`, delivery fees to admin `Setting` / env.
- [ ] `PRODUCTION_CHECKLIST.md` — all 11 boxes unchecked; legal/tax review (Data Protection Act, consumer protection) required.

## 11. Missing pages / API methods (quick ref)

- Wishlist: local-only (`wishlist/page.tsx:12-18`), no API/sync → add `GET/POST/DELETE /api/wishlist` (model exists).
- `SavedSearch`: model exists, no UI/API → add save + price-alert emails.
- `Follow sellers`: no model/route → add if wanted (Jiji doesn't have it — differentiator).
- No `DELETE` on: shops, shops/plan (cancel), orders, conversations, promotions, reviews, verify (revoke), upload.
- No `GET` on: enquiries (seller inbox), reports (admin queue via API), referrals (POST create), newsletter (unsub).
- Order detail: no cancel/return/tracking timeline.

## 12. Suggested build order (small PRs)

1. Secrets + middleware JWT + Redis limiter/guard + health checks.
2. S3 storage + upload hardening + signed private docs.
3. Daraja STK + callback + plan/boost activation + reversals.
4. Email/SMS adapters + queue + newsletter/consent + OTP lookup.
5. Server cart + stock transaction + idempotency + order state machine + shipping matrix.
6. Search index (Prisma FTS) + suggest + sitemap + scrub demo PII.
7. Chat ownership + block/mute/delete + read receipts + dispute SLA/evidence + review edit/response.
8. Recurring billing + invoices + bulk async + staff invites + referral hardening.
9. Admin bulk moderation + audit log + analytics Postgres move + exports.
10. Sentry + structured logs + backup drill + Sentry/cron + PRODUCTION_CHECKLIST sign-off.
