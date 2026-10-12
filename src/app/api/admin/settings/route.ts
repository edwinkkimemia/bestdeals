import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const KE_PHONE = /^(\+254|0)[17]\d{8}$/;

const schema = z.object({
  announcement_enabled: z.boolean().optional(),
  announcement_text: z.string().trim().max(200).optional(),
  support_email: z.string().trim().max(120).optional(),
  support_phone: z.string().trim().max(20).optional(),
  support_whatsapp: z.string().trim().max(20).optional(),
  registrations_open: z.boolean().optional(),
  commission_bps: z.number().int().min(0).max(3000).optional(),
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Admin-only: read all site settings. */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const store = getStore();
  const keys = [
    "announcement_enabled", "announcement_text",
    "support_email", "support_phone", "support_whatsapp",
    "registrations_open", "commission_bps",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = await store.getSetting(k).catch(() => null);
  return NextResponse.json({ settings: out });
}

/** Admin-only: update site settings (whitelisted keys, validated). */
export async function PUT(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const rl = rateLimit(clientKey(req, `settings:${user.id}`), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many updates. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the form." }, { status: 400 });
  const d = parsed.data;
  if (d.support_email !== undefined && d.support_email !== "" && !EMAIL.test(d.support_email)) {
    return NextResponse.json({ error: "Support email looks invalid." }, { status: 400 });
  }
  for (const k of ["support_phone", "support_whatsapp"] as const) {
    const v = d[k];
    if (v !== undefined && v !== "" && !KE_PHONE.test(v)) {
      return NextResponse.json({ error: "Use a valid Kenyan phone e.g. 0712345678." }, { status: 400 });
    }
  }
  const store = getStore();
  if (d.announcement_enabled !== undefined) await store.setSetting("announcement_enabled", d.announcement_enabled ? "1" : "0");
  if (d.announcement_text !== undefined) await store.setSetting("announcement_text", d.announcement_text);
  if (d.support_email !== undefined) await store.setSetting("support_email", d.support_email);
  if (d.support_phone !== undefined) await store.setSetting("support_phone", d.support_phone);
  if (d.support_whatsapp !== undefined) await store.setSetting("support_whatsapp", d.support_whatsapp);
  if (d.registrations_open !== undefined) await store.setSetting("registrations_open", d.registrations_open ? "1" : "0");
  if (d.commission_bps !== undefined) await store.setSetting("commission_bps", String(d.commission_bps));
  return NextResponse.json({ ok: true });
}
