import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { uid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  const email = ct.includes("application/json")
    ? String((await req.json().catch(() => ({} as { email?: string }))).email || "").trim()
    : String((await req.formData().catch(() => null))?.get("email") || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const store = getStore();
  const token = uid("nl");
  const list = ((await store.getSetting("newsletter").catch(() => null)) as { email: string; token: string; verified: boolean; at: string }[] | null) ?? [];
  if (!list.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
    list.unshift({ email, token, verified: false, at: new Date().toISOString() });
    await store.setSetting("newsletter", list.slice(0, 5000)).catch(() => {});
  }
  // Double-opt-in when email is live, else instant demo subscribe.
  const { isNotifyLive, sendNotification } = await import("@/lib/notify");
  if (isNotifyLive("email")) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://chap.co.ke";
    await sendNotification({ channel: "email", to: email, subject: "Confirm your Chap subscription", message: `Confirm: ${base}/api/newsletter/confirm?token=${token}` }).catch(() => {});
  } else {
    const cur = ((await store.getSetting("newsletter").catch(() => null)) as typeof list | null) ?? [];
    await store.setSetting("newsletter", cur.map((x) => (x.email.toLowerCase() === email.toLowerCase() ? { ...x, verified: true } : x))).catch(() => {});
  }
  if (ct.includes("application/json")) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL("/?newsletter=thanks", req.url), 303);
}

export async function DELETE(req: NextRequest) {
  const email = (new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });
  const store = getStore();
  const list = ((await store.getSetting("newsletter").catch(() => null)) as { email: string }[] | null) ?? [];
  await store.setSetting("newsletter", list.filter((x) => x.email.toLowerCase() !== email)).catch(() => {});
  return NextResponse.json({ ok: true });
}
