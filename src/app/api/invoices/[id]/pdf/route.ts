import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceForUser } from "@/lib/invoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authenticated PDF download. Owners and admins only. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const invoice = await getInvoiceForUser(params.id, user).catch(() => null);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const bytes = await buildInvoicePdf(invoice);
  const filename = `Chap-${invoice.number.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
