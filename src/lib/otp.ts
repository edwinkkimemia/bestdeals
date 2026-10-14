/** Guest OTP for phone lookups (orders/chats). Demo: deterministic code logged,
 * real SMS when SMS_PROVIDER is set. Codes live in store settings (works demo + PG).
 */
import { getStore } from "./store";
import { sendNotification } from "./notify";

const CODE_MS = 10 * 60_000;
const MAX_TRIES = 5;

function key(phone: string): string {
  return `otp:${phone}`;
}

function codeFor(phone: string, seed: number): string {
  let h = seed;
  for (let i = 0; i < phone.length; i++) h = (Math.imul(h, 31) + phone.charCodeAt(i)) | 0;
  return String(100000 + (Math.abs(h) % 900000));
}

export async function requestOtp(phone: string): Promise<{ ok: true; demoCode?: string }> {
  const store = getStore();
  const seed = Date.now();
  const code = codeFor(phone, seed);
  await store.setSetting(key(phone), { code, exp: Date.now() + CODE_MS, tries: 0, seed }).catch(() => {});
  const smsLive = Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);
  if (smsLive) {
    await sendNotification({ channel: "sms", to: phone, message: `Chap verification code: ${code}. Valid 10 min. Never share it.` }).catch(() => {});
    return { ok: true };
  }
  // Demo mode: never log the code (PII + credential in log streams) — return
  // it only outside production so manual testing isn't blocked.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[otp] demo code requested for verification (see API response in dev only)`);
  }
  return { ok: true, demoCode: process.env.NODE_ENV === "production" ? undefined : code };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const store = getStore();
  const rec = (await store.getSetting(key(phone)).catch(() => null)) as { code?: string; exp?: number; tries?: number } | null;
  if (!rec?.code || !rec.exp || Date.now() > rec.exp) return false;
  if ((rec.tries ?? 0) >= MAX_TRIES) return false;
  if (rec.code !== code.trim()) {
    await store.setSetting(key(phone), { ...rec, tries: (rec.tries ?? 0) + 1 }).catch(() => {});
    return false;
  }
  await store.setSetting(key(phone), null).catch(() => {});
  // Mark phone verified for this session window (30 min) — API routes check this.
  await store.setSetting(`otp_ok:${phone}`, { at: Date.now(), exp: Date.now() + 30 * 60_000 }).catch(() => {});
  return true;
}

export async function isPhoneVerified(phone: string): Promise<boolean> {
  const rec = (await getStore().getSetting(`otp_ok:${phone}`).catch(() => null)) as { exp?: number } | null;
  return Boolean(rec?.exp && Date.now() < rec.exp);
}
