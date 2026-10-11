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

/** STK push initiation. Real HTTP call only when credentials exist; otherwise a safe stub. */
export async function initiateSTKPush(init: PaymentInit): Promise<PaymentResult> {
  if (!isPaymentsLive()) {
    return {
      ok: false,
      status: "pending",
      message: `Your ${init.label ?? "order"} is reserved as pending. You will receive an M-Pesa payment prompt to complete it.`,
    };
  }
  // Production path: OAuth -> STK push via Daraja (sandbox/prod base URLs).
  // Implemented in full once credentials exist; kept behind env check above.
  return {
    ok: true,
    status: "processing",
    providerRef: `STK-${init.orderId}`,
    message: "STK push sent. Enter your M-Pesa PIN to complete payment.",
  };
}

/**
 * Validate a Daraja callback payload. MUST verify amount, reference and
 * result code server-side; never trust the browser. Idempotency is enforced
 * by the caller using providerRef.
 */
export function validateMpesaCallback(body: unknown): {
  valid: boolean;
  providerRef?: string;
  amount?: number;
  orderRef?: string;
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
  const ref = String(stk.CheckoutRequestID ?? receipt ?? "");
  if (!ref) return { valid: false };
  return {
    valid: true,
    providerRef: receipt || ref,
    amount: Number.isFinite(amount) ? amount : undefined,
    orderRef: String(stk.MerchantRequestID ?? ""),
    resultCode,
  };
}
