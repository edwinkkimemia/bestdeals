/**
 * Payment provider abstraction. M-Pesa Daraja adapter is implemented;
 * card/COD are explicit extension points. Nothing is "live" until
 * credentials are configured — see .env.example + docs/providers.md.
 */

export type PaymentMethod = "mpesa" | "card" | "cod";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentInit = {
  orderId: string;
  amount: number;
  phone: string;
  method: PaymentMethod;
  /** Human label for messages (e.g. "plan", "boost"). Defaults to "order". */
  label?: string;
};

export type PaymentResult = {
  ok: boolean;
  providerRef?: string;
  status: PaymentStatus;
  message: string;
};

export function isPaymentsLive(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
  );
}

function darajaBase(): string {
  return (process.env.MPESA_ENV || "sandbox") === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

/**
 * Daraja POSTs to our exact CallBackURL, query string included — so a long
 * random `MPESA_CALLBACK_SECRET` in the URL authenticates callbacks (Daraja
 * sends no HMAC/IP guarantees we can rely on behind Vercel's proxies).
 * Production MUST set it; without it any caller can forge callbacks.
 */
export function mpesaCallbackUrl(): string {
  const base = process.env.MPESA_CALLBACK_URL || "https://chap.co.ke/api/payments/mpesa-callback";
  const secret = (process.env.MPESA_CALLBACK_SECRET || "").trim();
  if (!secret) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}key=${encodeURIComponent(secret)}`;
}

/** True when callback authentication is enforced (secret configured). */
export function isCallbackAuthEnforced(): boolean {
  return (process.env.MPESA_CALLBACK_SECRET || "").trim().length >= 16;
}

/** Timing-safe check of the `?key=` callback secret. Open (true) when unset — configure it in prod. */
export function verifyCallbackSecret(url: string): boolean {
  const secret = (process.env.MPESA_CALLBACK_SECRET || "").trim();
  if (!secret) return true;
  let given = "";
  try {
    given = new URL(url).searchParams.get("key") ?? "";
  } catch {
    return false;
  }
  if (given.length !== secret.length || given.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function darajaToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const r = await fetch(`${darajaBase()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Daraja OAuth failed (${r.status})`);
  const j = (await r.json().catch(() => ({}))) as { access_token?: string };
  if (!j.access_token) throw new Error("Daraja OAuth: no token");
  return j.access_token;
}

function normalizeKEPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("254") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 10) return `254${d.slice(1)}`;
  if (d.length === 9) return `254${d}`;
  return d;
}

/** STK push initiation. Real Daraja HTTP when credentials exist; otherwise a safe stub. */
export async function initiateSTKPush(init: PaymentInit): Promise<PaymentResult> {
  if (!isPaymentsLive()) {
    return {
      ok: false,
      status: "pending",
      message: `Your ${init.label ?? "order"} is reserved as pending. You will receive an M-Pesa payment prompt to complete it.`,
    };
  }
  try {
    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const ts = timestamp();
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
    const token = await darajaToken();
    const callbackURL = mpesaCallbackUrl();
    // AccountReference carries our order/promo id so the callback can map back.
    const r = await fetch(`${darajaBase()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(init.amount),
        PartyA: normalizeKEPhone(init.phone),
        PartyB: shortcode,
        PhoneNumber: normalizeKEPhone(init.phone),
        CallBackURL: callbackURL,
        AccountReference: init.orderId.slice(0, 20),
        TransactionDesc: `${(init.label ?? "order").slice(0, 40)} ${init.orderId.slice(0, 12)}`,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      ResponseCode?: string;
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      errorMessage?: string;
      ResponseDescription?: string;
    };
    if (!r.ok || j.ResponseCode !== "0" || !j.CheckoutRequestID) {
      return { ok: false, status: "failed", message: j.errorMessage || j.ResponseDescription || "M-Pesa request failed. Try again." };
    }
    // Persist the Daraja → order mapping for the callback (settings-backed, demo + PG).
    try {
      const { getStore } = await import("./store");
      await getStore().setSetting(`mpesa_req:${j.CheckoutRequestID}`, { orderId: init.orderId, amount: Math.round(init.amount), at: new Date().toISOString() });
      if (j.MerchantRequestID) {
        await getStore().setSetting(`mpesa_req:${j.MerchantRequestID}`, { orderId: init.orderId, amount: Math.round(init.amount), at: new Date().toISOString() });
      }
    } catch {}
    return {
      ok: true,
      status: "processing",
      providerRef: j.CheckoutRequestID,
      message: "STK push sent. Enter your M-Pesa PIN to complete payment.",
    };
  } catch (e) {
    return { ok: false, status: "failed", message: (e as Error)?.message?.slice(0, 160) || "M-Pesa request failed." };
  }
}

export type ReversalInput = { receipt: string; amount: number; occasion?: string };
export type ReversalResult = { ok: boolean; message: string; conversationId?: string };

/**
 * Daraja transaction reversal (M-Pesa → customer). Needs MPESA_INITIATOR_NAME
 * plus a pre-encrypted MPESA_SECURITY_CREDENTIAL (generate it with Safaricom's
 * credential tooling and paste it into env — the private key never lives here).
 * Without both, returns ok:false so callers fall back to ledger + manual flow.
 */
export async function requestDarajaReversal(input: ReversalInput): Promise<ReversalResult> {
  if (!isPaymentsLive()) {
    return { ok: false, message: "M-Pesa reversal unavailable (provider not configured)." };
  }
  const initiator = (process.env.MPESA_INITIATOR_NAME || "").trim();
  const credential = (process.env.MPESA_SECURITY_CREDENTIAL || "").trim();
  if (!initiator || !credential) {
    return { ok: false, message: "Reversal credentials not configured." };
  }
  try {
    const token = await darajaToken();
    const r = await fetch(`${darajaBase()}/mpesa/reversal/v1/request`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        Initiator: initiator,
        SecurityCredential: credential,
        CommandID: "TransactionReversal",
        TransactionID: input.receipt,
        Amount: Math.round(input.amount),
        ReceiverParty: process.env.MPESA_SHORTCODE!,
        ReceiverIdentifierType: "11",
        Remarks: "Chap dispute refund",
        Occasion: (input.occasion ?? `refund-${Date.now().toString(36)}`).slice(0, 40),
      }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      ResponseCode?: string;
      ConversationID?: string;
      errorMessage?: string;
      ResponseDescription?: string;
    };
    if (!r.ok || j.ResponseCode !== "0" || !j.ConversationID) {
      return { ok: false, message: j.errorMessage || j.ResponseDescription || "Reversal rejected." };
    }
    return { ok: true, message: "Reversal submitted to M-Pesa.", conversationId: j.ConversationID };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message?.slice(0, 160) || "Reversal failed." };
  }
}

/** Resolve a Daraja CheckoutRequestID/MerchantRequestID to our order id. */
export async function resolveMpesaOrderId(ref: string): Promise<{ orderId?: string; amount?: number }> {
  try {
    const { getStore } = await import("./store");
    const rec = (await getStore().getSetting(`mpesa_req:${ref}`).catch(() => null)) as { orderId?: string; amount?: number } | null;
    return rec ?? {};
  } catch {
    return {};
  }
}

/**
 * Validate a Daraja callback payload. MUST verify amount, reference and
 * result code server-side; never trust the browser. Idempotency is enforced
 * by the caller using providerRef. orderRef is the Daraja request id — callers
 * resolve it to our order via resolveMpesaOrderId() (AccountReference mapping).
 */
export function validateMpesaCallback(body: unknown): {
  valid: boolean;
  providerRef?: string;
  amount?: number;
  orderRef?: string;
  checkoutRequestId?: string;
  resultCode?: number;
} {
  if (!body || typeof body !== "object") return { valid: false };
  const b = body as Record<string, unknown>;
  const stk = (b.Body as Record<string, unknown> | undefined)?.stkCallback as
    | Record<string, unknown>
    | undefined;
  if (!stk) return { valid: false };
  const resultCode = Number(stk.ResultCode);
  const meta = (stk.CallbackMetadata as Record<string, unknown> | undefined)?.Item as
    | { Name?: string; Value?: unknown }[]
    | undefined;
  const get = (n: string) => meta?.find((i) => i.Name === n)?.Value;
  const amount = Number(get("Amount") ?? NaN);
  const receipt = String(get("MpesaReceiptNumber") ?? "");
  const checkoutId = String(stk.CheckoutRequestID ?? "");
  const merchantId = String(stk.MerchantRequestID ?? "");
  const ref = checkoutId || receipt;
  if (!ref && Number.isNaN(resultCode)) return { valid: false };
  if (!ref && !merchantId) return { valid: false };
  return {
    valid: true,
    providerRef: receipt || checkoutId || merchantId,
    amount: Number.isFinite(amount) ? amount : undefined,
    orderRef: checkoutId || merchantId,
    checkoutRequestId: checkoutId || undefined,
    resultCode,
  };
}
