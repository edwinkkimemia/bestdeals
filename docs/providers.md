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

- Set `S3_*` vars; product images go to the public CDN prefix, seller/ID documents to a **private** prefix with signed URLs.
- Uploads validated: JPG/PNG/WebP, ≤5MB, ≤8 per listing (`/api/upload`).
