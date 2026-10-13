/** Persistent audit trail backed by store settings (demo + PG safe).
 * Prisma has an AuditLog table; this settings-backed log works on both
 * backends today and is surfaced in /admin. Cap 2000 entries.
 */
import { getStore } from "./store";

export type AuditEntry = {
  at: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity?: string;
  entityId?: string;
  reason?: string;
};

const KEY = "audit_log";
const CAP = 2000;

export async function logAudit(e: Omit<AuditEntry, "at">): Promise<void> {
  try {
    const store = getStore();
    const cur = ((await store.getSetting(KEY).catch(() => null)) as AuditEntry[] | null) ?? [];
    cur.unshift({ ...e, at: new Date().toISOString() });
    await store.setSetting(KEY, cur.slice(0, CAP)).catch(() => {});
  } catch {}
}

export async function listAudit(limit = 100): Promise<AuditEntry[]> {
  const cur = ((await getStore().getSetting(KEY).catch(() => null)) as AuditEntry[] | null) ?? [];
  return cur.slice(0, Math.min(Math.max(limit, 1), 500));
}
