"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Download, Loader2, Mail, Megaphone, ReceiptText } from "lucide-react";
import type { InvoiceView } from "@/lib/invoices";
import { formatKES } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "paid" | "unpaid";

function dateLabel(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "—";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(status: InvoiceView["status"]): string {
  if (status === "paid") return "!border-green-600 !text-green-700";
  if (status === "void") return "!border-neutral-400 !text-ink-500";
  return "!border-amber-500 !text-amber-700";
}

/**
 * Searchable, mobile-safe invoice centre. The PDF endpoint is authenticated,
 * so download links work directly in the browser while email sends a fresh
 * copy through the configured provider.
 */
export function InvoiceCenter({ invoices }: { invoices: InvoiceView[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [emailing, setEmailing] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, { ok: boolean; message: string }>>({});

  const paid = invoices.filter((i) => i.status === "paid");
  const unpaid = invoices.filter((i) => i.status === "pending");
  const filtered = useMemo(
    () =>
      invoices.filter((i) =>
        filter === "paid" ? i.status === "paid" : filter === "unpaid" ? i.status === "pending" : true
      ),
    [filter, invoices]
  );
  const paidTotal = paid.reduce((sum, i) => sum + i.amount, 0);
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.amount, 0);

  const sendEmail = async (invoice: InvoiceView) => {
    setEmailing(invoice.id);
    setNotices((current) => ({ ...current, [invoice.id]: { ok: true, message: "Sending…" } }));
    try {
      const res = await fetch(invoice.id ? `/api/invoices/${encodeURIComponent(invoice.id)}/email` : "", {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string; demo?: boolean };
      setNotices((current) => ({
        ...current,
        [invoice.id]: {
          ok: Boolean(res.ok && (json.ok || json.demo)),
          message: json.message || json.error || (res.ok ? "Invoice emailed." : "Could not send the invoice."),
        },
      }));
    } catch {
      setNotices((current) => ({
        ...current,
        [invoice.id]: { ok: false, message: "Network error — try again." },
      }));
    } finally {
      setEmailing(null);
    }
  };

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: invoices.length },
    { id: "paid", label: "Paid", count: paid.length },
    { id: "unpaid", label: "Unpaid", count: unpaid.length },
  ];

  return (
    <div className="mt-5 min-w-0">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Paid receipts</p>
          <p className="mt-1 text-2xl font-extrabold text-green-700">{formatKES(paidTotal)}</p>
          <p className="text-xs text-ink-500">{paid.length} paid document{paid.length === 1 ? "" : "s"}</p>
        </div>
        <div className="card min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Unpaid</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700">{formatKES(unpaidTotal)}</p>
          <p className="text-xs text-ink-500">{unpaid.length} awaiting payment</p>
        </div>
        <div className="card min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">All documents</p>
          <p className="mt-1 text-2xl font-extrabold">{invoices.length}</p>
          <p className="text-xs text-ink-500">Plans and promotions combined</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter invoices">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                filter === tab.id
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-neutral-200 text-ink-600 hover:border-brand-600"
              )}
            >
              {tab.label} <span className="text-ink-400">({tab.count})</span>
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-ink-400">PDFs include the Chap logo and full purchase details.</p>
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <ReceiptText className="mx-auto h-9 w-9 text-neutral-300" />
          <p className="mt-2 font-bold">{invoices.length === 0 ? "No invoices yet" : "No invoices match this filter"}</p>
          <p className="mt-1 text-sm text-ink-500">
            {invoices.length === 0
              ? "Your plan and promotion receipts will appear here after your first purchase."
              : "Switch back to All to see every document."}
          </p>
          {invoices.length === 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href="/dashboard/plan" className="btn-primary !py-2 text-sm">View plans</Link>
              <Link href="/dashboard/promotion" className="btn-secondary !py-2 text-sm">Promote a listing</Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((invoice) => {
            const Icon = invoice.kind === "promotion" ? Megaphone : CreditCard;
            const notice = notices[invoice.id];
            return (
              <li key={invoice.id} className="card min-w-0 p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      invoice.kind === "promotion" ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
                      <span className="font-semibold uppercase tracking-wide">
                        {invoice.kind === "promotion" ? "Promotion" : "Plan"}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="font-mono text-[11px]">{invoice.number}</span>
                    </p>
                    <p className="mt-0.5 break-words text-sm font-bold text-ink-900">{invoice.description}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      Issued {dateLabel(invoice.issuedAt)} · {invoice.methodLabel}
                      {invoice.shop ? ` · ${invoice.shop.name}` : invoice.listing ? ` · ${invoice.listing.title}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto shrink-0 text-right">
                    <p className="font-extrabold">{formatKES(invoice.amount)}</p>
                    <span className={cn("chip mt-1 inline-flex", statusTone(invoice.status))}>{invoice.statusLabel}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                  <a href={invoice.downloadUrl} className="btn-secondary !px-3 !py-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => sendEmail(invoice)}
                    disabled={emailing === invoice.id}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    {emailing === invoice.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    Email invoice
                  </button>
                  <span className="text-xs text-ink-400">
                    {invoice.status === "paid"
                      ? `Paid ${dateLabel(invoice.paidAt)}${invoice.reference ? ` · Ref ${invoice.reference}` : ""}`
                      : invoice.status === "void"
                        ? "Voided — no payment due"
                        : `Due ${dateLabel(invoice.dueAt)}${invoice.reference ? ` · Awaiting ${invoice.reference}` : ""}`}
                  </span>
                  {invoice.kind === "plan" ? (
                    <Link href="/dashboard/plan" className="link-bd ml-auto text-xs">Manage plan</Link>
                  ) : (
                    <Link href="/dashboard/promotion" className="link-bd ml-auto text-xs">Manage boost</Link>
                  )}
                </div>

                {notice && (
                  <p
                    role="status"
                    className={cn(
                      "mt-2 break-words rounded-lg px-2.5 py-2 text-xs",
                      notice.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"
                    )}
                  >
                    {notice.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
