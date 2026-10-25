import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getNotificationPrefs, saveNotificationPrefs } from "@/lib/notification-preferences";
import { NOTIFICATION_PREF_TYPES, type NotificationPrefType } from "@/lib/notification-prefs";

export const runtime = "nodejs";

const schema = z.object({
  prefs: z.record(z.string(), z.boolean()).optional(),
});

/** Read this account's notification type preferences (push). */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ prefs: await getNotificationPrefs(user.id) });
}

/** Update one or more push type preferences. In-app notifications stay on. */
export async function PUT(req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification preferences." }, { status: 400 });

  const incoming = parsed.data.prefs ?? {};
  const allowed = new Set<string>(NOTIFICATION_PREF_TYPES);
  const clean = Object.fromEntries(
    Object.entries(incoming).filter(([key, value]) => allowed.has(key) && typeof value === "boolean")
  );
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: "Choose at least one notification type." }, { status: 400 });
  }
  const prefs = await saveNotificationPrefs(user.id, clean as Partial<Record<NotificationPrefType, boolean>>);
  return NextResponse.json({ ok: true, prefs });
}
