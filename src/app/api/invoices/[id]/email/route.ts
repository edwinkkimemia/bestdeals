import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sendInvoiceEmailById } from "@/lib/invoice-email";
import { getInvoiceForUser } from "@/lib/invoices";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resend an invoice/receipt to the account's billing email. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(clientKey(req, `invoice:email:${user.id}`), { limit: 20, windowMs: 3600_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many email requests. Try again later." }, { status: 429 });
  const invoice = await getInvoiceForUser(params.id, user).catch(() => null);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const result = await sendInvoiceEmailById(invoice.id, {
    reason: "resend",
    force: true,
    origin: new URL(req.url).origin,
  }).catch((error) => ({
    ok: false,
    live: false,
    demo: false,
    provider: "error",
    message: (error as Error)?.message || "Could not send the email.",
  }));
  return NextResponse.json(
    {
      ok: result.ok,
      demo: result.demo,
      message: result.message,
      provider: result.provider,
    },
    { status: result.ok || result.demo ? 200 : 502 }
  );
}
