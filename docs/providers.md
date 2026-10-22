# Provider configuration (M-Pesa, comms, storage)

> Nothing is labelled "live" in the UI until credentials are configured **and** tested.

## M-Pesa Daraja

1. Create an app at developer.safaricom.co.ke (sandbox first).
2. Set `MPESA_ENV` (`sandbox` or `production`), `MPESA_CONSUMER_KEY/SECRET`,
   `MPESA_SHORTCODE`, `MPESA_PASSKEY` and `MPESA_CALLBACK_URL`.
3. Paybill: leave `MPESA_TILL` empty. STK sends `CustomerPayBillOnline` with
   `PartyB` = `MPESA_SHORTCODE`.
4. Buy Goods: set `MPESA_TILL` to the store/Till number. STK sends
   `CustomerBuyGoodsOnline` with `PartyB` = the Till, while the password and
   `BusinessShortCode` use `MPESA_SHORTCODE`. `MPESA_TRANSACTION_TYPE` can
   override the inferred type if Safaricom support gives different guidance.
5. Set `MPESA_CALLBACK_SECRET` (32+ random hex) — it is appended as `?key=` and verified on every callback. Without it, forged callbacks can mark orders paid.
6. Use `https://www.chap.co.ke/api/payments/mpesa-callback` as
   `MPESA_CALLBACK_URL` in production (the apex domain redirects to `www`, and
   Daraja needs the final HTTPS URL).
7. Flow: `POST /api/orders` reserves the order → `POST /api/payments/initiate` sends STK push →
   Daraja calls `POST /api/payments/mpesa-callback` → server validates amount/reference/result code,
   writes the ledger idempotently (unique `providerRef`), then transitions `pending → paid`.
8. Never mark orders paid from browser state. Test with sandbox phones, then go live.
9. For dispute refunds: set `MPESA_INITIATOR_NAME` + pre-encrypted `MPESA_SECURITY_CREDENTIAL`; reversals submit live, otherwise refunds stay ledger-only with manual follow-up.

## Email / SMS / WhatsApp

- Set `EMAIL_PROVIDER` (resend/sendgrid/zeptomail) + `EMAIL_API_KEY` + `EMAIL_FROM="info@chap.co.ke"`, or `SMS_PROVIDER` (e.g. africastalking) + key.
- Zoho (recommended if your mailbox is Zoho): use **ZeptoMail**, not regular Zoho
  Mail SMTP — the app has no SMTP client. Steps: ZeptoMail → add + verify the
  `chap.co.ke` domain (SPF/DKIM) → create a Mail Agent for `info@chap.co.ke` →
  Agent → SMTP/API → copy the **Send Mail Token** → Vercel env
  `EMAIL_PROVIDER=zeptomail`, `EMAIL_API_KEY=<send mail token>`,
  `EMAIL_FROM=info@chap.co.ke` → redeploy. `/api/health` shows `email: live`.
- The sending domain must be verified in the provider first: add Resend/SendGrid's
  SPF + DKIM records to chap.co.ke DNS, otherwise `info@chap.co.ke` sends are
  rejected. Then add the three vars in Vercel → Project → Settings → Environment
  Variables (Production) and redeploy. `/api/health` shows `email: live` when active.
- Without keys, `src/lib/notify.ts` logs to console (demo mode).
- WhatsApp contact uses only seller-approved numbers; arbitrary user links are never rendered.
- Bulk messaging requires explicit opt-in; honour unsubscribe + consent records.

## Object storage

- Production needs persistent storage: `public/uploads` is git-ignored and
  Vercel `/tmp` is wiped on every redeploy, so profile photos, shop
  logos/covers and listing images disappear without it. `DATABASE_URL`
  (Postgres) is required regardless — without it the whole store (including
  image URLs) is per-instance memory.
- Set `S3_BUCKET` + `S3_ACCESS_KEY` + `S3_SECRET_KEY` (plus `S3_REGION`,
  optional `S3_ENDPOINT` for R2/MinIO); S3 auto-enables as soon as the keys
  exist. `UPLOAD_DRIVER` is optional: `s3` forces S3, `local` forces local.
  Product images go to the public `public/` prefix, seller/ID documents to a
  **private** prefix with signed URLs.
- Without S3 on serverless, public uploads fall back to DB-backed
  `/api/files/db/…` URLs — the bytes (not just the URL string) are staged in
  Postgres, capped ~1.65MB after compression, so avatars/logos/covers survive
  redeploys; large listing batches still need S3. `/api/health` shows
  `uploads: s3|db-fallback|local` plus `uploadsDurable` (db-fallback counts as
  durable only when `DATABASE_URL` is set).
- All uploads require sign-in; deleting a staged image requires the uploader
  (or an admin).
- S3 buckets must allow public reads on the `public/*` prefix (bucket
  policy, not per-object ACLs) — the watermark endpoint fetches the public
  URL to bake the Chap mark, and product photos load from it directly. If
  the bucket is private, new product photos 404 and the gallery shows a
  placeholder instead of the photo.
- Uploads validated: JPG/PNG/WebP, ≤5MB, ≤8 per listing (`/api/upload`).
