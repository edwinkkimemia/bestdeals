import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listInvoicesForOwner } from "@/lib/invoices";
import { InvoiceCenter } from "./invoice-center";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/signin?next=/dashboard/invoices");
  const invoices = await listInvoicesForOwner(user.id).catch(() => []);
  return (
    <div>
      <h1 className="section-title flex items-center gap-2">
        <ReceiptText className="h-6 w-6 text-brand-600" /> Invoices &amp; receipts
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">
        Every Chap plan and listing boost lives here. Paid receipts and unpaid invoices are available to download as a branded PDF, and can be emailed again whenever you need them.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard/plan" className="link-bd">Plan &amp; billing →</Link>
        <span className="text-ink-300">·</span>
        <Link href="/dashboard/promotion" className="link-bd">Promotions →</Link>
      </div>
      <InvoiceCenter invoices={invoices} />
    </div>
  );
}
