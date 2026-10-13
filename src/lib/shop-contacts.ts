/** Shop public contacts: website, email + social profile links (seller-managed). */

export const SOCIAL_KEYS = ["facebook", "instagram", "x", "tiktok", "youtube"] as const;

export function normalizeUrlish(raw: unknown, max = 500): string | null | "invalid" {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "invalid";
    if (!u.hostname.includes(".")) return "invalid";
    return withProto.slice(0, max);
  } catch {
    return "invalid";
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ShopContactsPatch = {
  website?: string | null;
  email?: string | null;
  socials?: Record<string, string> | null;
};

/**
 * Validate raw contact input. Empty strings clear the field. Only keys
 * present in the input are included in the patch (absent = unchanged).
 */
export function normalizeShopContacts(input: {
  website?: unknown;
  email?: unknown;
  socials?: unknown;
}): { ok: true; patch: ShopContactsPatch } | { ok: false; error: string } {
  const patch: ShopContactsPatch = {};
  if (input.website !== undefined) {
    const v = normalizeUrlish(input.website);
    if (v === "invalid") return { ok: false, error: "Enter a valid website, e.g. yourshop.co.ke." };
    patch.website = v;
  }
  if (input.email !== undefined) {
    const s = String(input.email ?? "").trim();
    if (s && !EMAIL_RE.test(s)) return { ok: false, error: "Enter a valid email address." };
    patch.email = s ? s.slice(0, 320) : null;
  }
  if (input.socials !== undefined) {
    if (input.socials === null || input.socials === "") {
      patch.socials = null;
    } else if (typeof input.socials !== "object" || Array.isArray(input.socials)) {
      return { ok: false, error: "Social links must be platform → URL pairs." };
    } else {
      const out: Record<string, string> = {};
      for (const k of SOCIAL_KEYS) {
        const raw = (input.socials as Record<string, unknown>)[k];
        if (raw === undefined || raw === null || String(raw).trim() === "") continue;
        const v = normalizeUrlish(raw);
        if (v === "invalid" || !v) return { ok: false, error: `Enter a valid ${k} link (https://…).` };
        out[k] = v;
      }
      patch.socials = Object.keys(out).length > 0 ? out : null;
    }
  }
  return { ok: true, patch };
}
