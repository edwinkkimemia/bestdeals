/** Canonical demo roster: one account per catalogue seller (+ buyer).
 * Emails are derived exactly like prisma/seed.ts so DB + demo-mode logins match.
 * Passwords are PUBLIC demo credentials (SEED_USER_PASSWORD or ChapDemo123!).
 * Never used for admins — claim those via signup with an ADMIN_EMAILS address.
 */
import { hashPassword } from "./auth";
import type { Store } from "./store";

export const DEMO_PASSWORD_DEFAULT = "ChapDemo123!";

export function demoPassword(): string {
  return process.env.SEED_USER_PASSWORD || DEMO_PASSWORD_DEFAULT;
}

export const slugifyName = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 40) || "seller";

export type DemoUser = { name: string; email: string; phone: string; kind: "individual" | "business"; shopSlug?: string };

export const DEMO_USERS: DemoUser[] = [
  { name: "FonZone Nairobi", email: "fonzone.nairobi@demo.chap.co.ke", phone: "0722123456", kind: "business", shopSlug: "fon-zone-nairobi" },
  { name: "Daniel K.", email: "daniel.k@demo.chap.co.ke", phone: "0710000109", kind: "individual" },
  { name: "Pwani Homes", email: "pwani.homes@demo.chap.co.ke", phone: "0710000110", kind: "individual" },
  { name: "Achieng O.", email: "achieng.o@demo.chap.co.ke", phone: "0710000111", kind: "individual" },
  { name: "Kamau FixIt", email: "kamau.fixit@demo.chap.co.ke", phone: "0710000106", kind: "individual" },
  { name: "Mama Fua Styles", email: "mama.fua.styles@demo.chap.co.ke", phone: "0733987654", kind: "business", shopSlug: "mama-fua-styles" },
  { name: "Pwani Fresh Foods", email: "pwani.fresh.foods@demo.chap.co.ke", phone: "0700111222", kind: "business", shopSlug: "pwani-fresh-foods" },
  { name: "Kiprop M.", email: "kiprop.m@demo.chap.co.ke", phone: "0710000112", kind: "individual" },
  { name: "Rift Hardware Ltd", email: "rift.hardware.ltd@demo.chap.co.ke", phone: "0711223344", kind: "business", shopSlug: "rift-hardware" },
  { name: "Savannah SACCO", email: "savannah.sacco@demo.chap.co.ke", phone: "0710000105", kind: "business" },
  { name: "Wanjiku M.", email: "wanjiku.m@demo.chap.co.ke", phone: "0710000101", kind: "individual" },
  { name: "Otieno J.", email: "otieno.j@demo.chap.co.ke", phone: "0710000102", kind: "individual" },
  { name: "Mwangi K.", email: "mwangi.k@demo.chap.co.ke", phone: "0710000104", kind: "individual" },
  { name: "Chebet R.", email: "chebet.r@demo.chap.co.ke", phone: "0710000103", kind: "individual" },
  { name: "Naliaka W.", email: "naliaka.w@demo.chap.co.ke", phone: "0710000107", kind: "individual" },
  { name: "Baraka T.", email: "baraka.t@demo.chap.co.ke", phone: "0710000108", kind: "individual" },
  { name: "Demo Buyer", email: "demo.buyer@demo.chap.co.ke", phone: "0712345678", kind: "individual" },
];

export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@demo.chap.co.ke");
}

/** Create any missing demo users in the given store (demo-mode + DB safe, idempotent). */
export async function ensureDemoUsers(store: Store): Promise<{ created: number; total: number }> {
  const passwordHash = await hashPassword(demoPassword());
  let created = 0;
  for (const d of DEMO_USERS) {
    const existing = await store.findUserByEmail(d.email).catch(() => null);
    if (existing) continue;
    try {
      await store.createUser({
        name: d.name,
        email: d.email,
        phone: d.phone,
        role: "SELLER",
        verified: d.name === "Demo Buyer" ? false : true,
        emailVerified: true,
        sellerKind: d.kind,
        passwordHash,
      });
      created += 1;
    } catch {}
  }
  return { created, total: DEMO_USERS.length };
}
