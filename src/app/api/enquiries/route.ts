import { NextRequest, NextResponse } from "next/server";
import { enquirySchema } from "@/lib/validators";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notify";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "enquiry"), { limit: 15, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many enquiries. Please wait before sending more." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid enquiry." }, { status: 400 });
  await sendNotification({ channel: "sms", to: parsed.data.phone, message: `Chap: your enquiry for listing ${parsed.data.listingId} was sent. The seller will respond.` }).catch(() => {});
  const rec = await getStore().createEnquiry({ listingId: parsed.data.listingId, name: parsed.data.name, phone: parsed.data.phone, message: parsed.data.message });
  return NextResponse.json({ ok: true, id: rec.id });
}
