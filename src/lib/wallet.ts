/** Seller wallet (Jiji-style Balance lite): credit for plans/boosts/airtime.
 * Backed by store settings per user + in-memory ledger history. Works demo + PG
 * without a schema migration; a future Wallet table can replace the backend.
 */
import { getStore } from "./store";
import { uid } from "./utils";

export type WalletTx = { id: string; at: string; kind: string; amount: number; note?: string };

function balKey(userId: string): string {
  return `wallet:${userId}`;
}
function histKey(userId: string): string {
  return `wallet_hist:${userId}`;
}

export async function getBalance(userId: string): Promise<number> {
  const v = (await getStore().getSetting(balKey(userId)).catch(() => null)) as number | null;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function walletHistory(userId: string, limit = 50): Promise<WalletTx[]> {
  const h = ((await getStore().getSetting(histKey(userId)).catch(() => null)) as WalletTx[] | null) ?? [];
  return h.slice(0, limit);
}

async function pushTx(userId: string, tx: Omit<WalletTx, "id" | "at">): Promise<WalletTx> {
  const rec: WalletTx = { ...tx, id: uid("wtx"), at: new Date().toISOString() };
  const h = await walletHistory(userId, 200).catch(() => []);
  await getStore().setSetting(histKey(userId), [rec, ...h].slice(0, 200)).catch(() => {});
  return rec;
}

/** Credit (top-up, referral reward). Amount must be positive. */
export async function creditWallet(userId: string, amount: number, kind = "topup", note?: string): Promise<number> {
  const amt = Math.round(amount);
  if (amt <= 0) throw new Error("Amount must be positive.");
  const bal = (await getBalance(userId).catch(() => 0)) + amt;
  await getStore().setSetting(balKey(userId), bal).catch(() => {});
  await pushTx(userId, { kind, amount: amt, note }).catch(() => {});
  return bal;
}

/** Debit for a purchase (plan/boost). Returns false when insufficient. */
export async function debitWallet(userId: string, amount: number, kind = "spend", note?: string): Promise<{ ok: boolean; balance: number }> {
  const amt = Math.round(amount);
  const bal = await getBalance(userId).catch(() => 0);
  if (amt <= 0) return { ok: true, balance: bal };
  if (bal < amt) return { ok: false, balance: bal };
  const next = bal - amt;
  await getStore().setSetting(balKey(userId), next).catch(() => {});
  await pushTx(userId, { kind, amount: -amt, note }).catch(() => {});
  return { ok: true, balance: next };
}
