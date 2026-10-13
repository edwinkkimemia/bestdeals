import { NextRequest, NextResponse } from "next/server";
import { enquirySchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { notifyLater } from "@/lib/notify";
import { getStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "enquiry"), { limit: 15, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many enquiries. Please wait before sending more." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid enquiry." }, { status: 400 });
  notifyLater({ channel: "sms", to: parsed.data.phone, message: `Chap: your enquiry for listing ${parsed.data.listingId} was sent. The seller will respond.` });
  const rec = await getStore().createEnquiry({ listingId: parsed.data.listingId, name: parsed.data.name, phone: parsed.data.phone, message: parsed.data.message });
  // Mirror for the seller inbox (DemoStore has no list method; settings work on both backends).
  try {
    const store = getStore();
    const cur = ((await store.getSetting("enquiries_mirror").catch(() => null)) as typeof rec[] | null) ?? [];
    await store.setSetting("enquiries_mirror", [rec, ...cur].slice(0, 500)).catch(() => {});
  } catch {}
  return NextResponse.json({ ok: true, id: rec.id });
}

/** Seller inbox: enquiries on my listings (owner or staff). */
export async function GET(_req: NextRequest) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const store = getStore();
  const mine = await store.listListingsByOwner(user.id).catch(() => []);
  const staffShops = await store.listStaffShops(user.id).catch(() => []);
  const staffSlugs = [...new Set(staffShops.map((s) => s.slug))];
  const staffLists = await Promise.all(staffSlugs.map((s) => store.listListingsByShop(s).catch(() => [])));
  const myIds = new Set([...mine.map((l) => l.id), ...staffLists.flat().map((l) => l.id)]);
  // DemoStore keeps enquiries in-memory without a list method — surface via settings mirror.
  const all = ((await store.getSetting("enquiries_mirror").catch(() => null)) as { id: string; listingId: string; name: string; phone: string; message: string; createdAt: string }[] | null) ?? [];
  const items = all.filter((e) => myIds.has(e.listingId)).slice(0, 100);
  return NextResponse.json({ items });
}
