# Provider configuration (M-Pesa, comms, storage)

> Nothing is labelled "live" in the UI until credentials are configured **and** tested.

## M-Pesa Daraja

1. Create an app at developer.safaricom.co.ke (sandbox first).
2. Set `MPESA_CONSUMER_KEY/SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`.
3. Flow: `POST /api/orders` reserves the order → `POST /api/payments/initiate` sends STK push →
   Daraja calls `POST /api/payments/mpesa-callback` → server validates amount/reference/result code,
   writes the ledger idempotently (unique `providerRef`), then transitions `pending → paid`.
4. Never mark orders paid from browser state. Test with sandbox phones, then go live.

## Email / SMS / WhatsApp

- Set `EMAIL_PROVIDER` (e.g. resend/sendgrid) + `EMAIL_API_KEY`, or `SMS_PROVIDER` (e.g. africastalking) + key.
- Without keys, `src/lib/notify.ts` logs to console (demo mode).
- WhatsApp contact uses only seller-approved numbers; arbitrary user links are never rendered.
- Bulk messaging requires explicit opt-in; honour unsubscribe + consent records.

## Object storage

- Set `S3_*` vars; product images go to the public CDN prefix, seller/ID documents to a **private** prefix with signed URLs.
- Uploads validated: JPG/PNG/WebP, ≤5MB, ≤8 per listing (`/api/upload`).
