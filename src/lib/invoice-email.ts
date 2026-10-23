/**
 * Invoice email delivery: branded HTML + a PDF attachment for every receipt,
 * both while a payment is pending and after it is confirmed.
 */
import { isNotifyLive, sendNotification } from "./notify";
import { buildInvoicePdf } from "./invoice-pdf";
import type { Store } from "./store";
import {
  getInvoiceById,
  invoiceDateLabel,
  markInvoiceEmailSent,
  readInvoiceLedger,
  type InvoiceView,
} from "./invoices";

export type InvoiceEmailReason = "created" | "paid" | "resend";

export type InvoiceEmailResult = {
  ok: boolean;
  skipped?: boolean;
  live: boolean;
  /** True when no email provider is configured; the invoice is only logged. */
  demo: boolean;
  provider: string;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

function siteBase(origin?: string): string {
  return (origin || process.env.NEXT_PUBLIC_SITE_URL || "https://chap.co.ke").replace(/\/+$/, "");
}

export function invoiceEmailHtml(invoice: InvoiceView, base: string): string {
  const paid = invoice.status === "paid";
  const statusColor = paid ? "#15803d" : invoice.status === "void" ? "#b00c1c" : "#b45309";
  const statusBg = paid ? "#dcfce7" : invoice.status === "void" ? "#fee2e2" : "#fef3c7";
  const statusLabel = paid ? "PAID" : invoice.status === "void" ? "VOID" : "UNPAID";
  const line = invoice.lineItems[0];
  const details = [
    invoice.shop ? { label: "Shop", value: invoice.shop.name } : null,
    invoice.listing ? { label: "Listing", value: invoice.listing.title } : null,
    { label: "Method", value: invoice.methodLabel },
    invoice.reference ? { label: "Reference", value: invoice.reference } : null,
    invoice.renewsAt ? { label: "Renews", value: invoiceDateLabel(invoice.renewsAt) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#101812;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f9;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(11,20,55,.12);">
        <tr><td style="height:7px;background:#0043D2;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="height:4px;background:#FE1123;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:26px 30px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><img src="${base}/chaplogo.png" width="168" alt="chap.co.ke" style="display:block;width:168px;max-width:100%;height:auto;border:0;"></td>
              <td align="right" valign="top"><span style="display:inline-block;background:${statusBg};color:${statusColor};font-size:11px;font-weight:800;letter-spacing:.08em;padding:7px 12px;border-radius:999px;">${statusLabel}</span></td>
            </tr>
          </table>
          <p style="margin:20px 0 0;color:#0043D2;font-size:12px;font-weight:800;letter-spacing:.1em;">INVOICE</p>
          <h1 style="margin:4px 0 0;font-size:26px;line-height:1.15;color:#101812;">${escapeHtml(invoice.number)}</h1>
          <p style="margin:8px 0 0;color:#5b6a63;font-size:14px;line-height:1.5;">${escapeHtml(invoice.description)}</p>
        </td></tr>
        <tr><td style="padding:20px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border-radius:12px;">
            <tr>
              <td width="50%" valign="top" style="padding:16px 18px;">
                <p style="margin:0 0 5px;color:#7d8c86;font-size:10px;font-weight:800;letter-spacing:.09em;">BILLED TO</p>
                <p style="margin:0;font-size:14px;font-weight:800;color:#101812;">${escapeHtml(invoice.customer.name)}</p>
                ${invoice.customer.email ? `<p style="margin:4px 0 0;font-size:12px;color:#5b6a63;">${escapeHtml(invoice.customer.email)}</p>` : ""}
                ${invoice.customer.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#5b6a63;">${escapeHtml(invoice.customer.phone)}</p>` : ""}
              </td>
              <td width="50%" valign="top" style="padding:16px 18px;">
                <p style="margin:0 0 5px;color:#7d8c86;font-size:10px;font-weight:800;letter-spacing:.09em;">INVOICE DETAILS</p>
                <p style="margin:0;font-size:12px;color:#5b6a63;">Issued: <strong style="color:#101812;">${escapeHtml(invoiceDateLabel(invoice.issuedAt))}</strong></p>
                <p style="margin:4px 0 0;font-size:12px;color:#5b6a63;">${paid ? "Paid" : "Due"}: <strong style="color:#101812;">${escapeHtml(invoiceDateLabel(paid ? invoice.paidAt : invoice.dueAt) || "—")}</strong></p>
                <p style="margin:4px 0 0;font-size:12px;color:#5b6a63;">Method: <strong style="color:#101812;">${escapeHtml(invoice.methodLabel)}</strong></p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 30px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#0043D2;color:#ffffff;">
              <th align="left" style="padding:10px 12px;font-size:10px;letter-spacing:.07em;">DESCRIPTION</th>
              <th align="right" style="padding:10px 12px;font-size:10px;letter-spacing:.07em;">AMOUNT</th>
            </tr>
            <tr>
              <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">
                <strong style="display:block;color:#101812;">${escapeHtml(line?.description || invoice.description)}</strong>
                ${line?.detail ? `<span style="display:block;margin-top:4px;color:#5b6a63;font-size:12px;">${escapeHtml(line.detail)}</span>` : ""}
                ${details.length ? `<span style="display:block;margin-top:7px;color:#7d8c86;font-size:11px;line-height:1.7;">${details.map((d) => `${escapeHtml(d.label)}: ${escapeHtml(d.value)}`).join("<br>")}</span>` : ""}
              </td>
              <td align="right" valign="top" style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:800;white-space:nowrap;">${money(invoice.amount)}</td>
            </tr>
            <tr>
              <td align="right" style="padding:12px 12px 0;color:#5b6a63;font-size:12px;">TOTAL</td>
              <td align="right" style="padding:12px 12px 0;font-size:18px;font-weight:900;color:#0043D2;white-space:nowrap;">${money(invoice.amount)}</td>
            </tr>
            <tr>
              <td align="right" style="padding:6px 12px 0;color:#5b6a63;font-size:12px;">${paid ? "Paid" : "Balance due"}</td>
              <td align="right" style="padding:6px 12px 0;color:${statusColor};font-size:13px;font-weight:800;white-space:nowrap;">${money(paid ? invoice.amount : invoice.status === "void" ? 0 : invoice.amount)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 30px 0;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#5b6a63;">
            ${paid
              ? "Payment received in full. Thank you for choosing Chap. Your PDF receipt is attached to this email."
              : "This invoice is currently unpaid. Complete the M-Pesa prompt or pay from your Chap wallet to activate it. A paid receipt will follow automatically."}
          </p>
          <a href="${base}/dashboard/invoices" style="display:inline-block;margin-top:16px;background:#0043D2;color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;padding:12px 20px;border-radius:10px;">View invoices</a>
        </td></tr>
        <tr><td style="padding:24px 30px 26px;">
          <hr style="border:0;border-top:1px solid #e2e8f0;margin:0 0 14px;">
          <p style="margin:0;color:#7d8c86;font-size:11px;line-height:1.7;">chap.co.ke · Kenya's marketplace for everything<br>Questions? <a href="mailto:support@chap.co.ke" style="color:#0043D2;text-decoration:none;">support@chap.co.ke</a></p>
          <p style="margin:10px 0 0;color:#9aa7b5;font-size:10px;line-height:1.6;">This is a computer-generated invoice. The PDF version is attached for your records.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send (or resend) an invoice. Automatic sends are idempotent: a pending
 * invoice only goes out once, and a paid receipt only goes out once.
 */
export async function sendInvoiceEmailById(
  id: string,
  opts?: { reason?: InvoiceEmailReason; origin?: string; force?: boolean; store?: Store }
): Promise<InvoiceEmailResult> {
  const reason = opts?.reason ?? "resend";
  const force = opts?.force ?? reason === "resend";
  const store = opts?.store;
  const liveConfigured = isNotifyLive("email");
  const invoice = await getInvoiceById(id, store).catch(() => null);
  if (!invoice) {
    return { ok: false, live: false, demo: !liveConfigured, provider: "none", message: "Invoice not found." };
  }
  if (!invoice.customer.email) {
    return {
      ok: false,
      live: false,
      demo: !liveConfigured,
      provider: "none",
      message: "No billing email on this account.",
    };
  }

  const ledger = await readInvoiceLedger(store);
  const stored = ledger.find((row) => row.id === invoice.id);
  if (!force && reason === "created" && stored?.emailedAt) {
    return {
      ok: true,
      skipped: true,
      live: false,
      demo: !liveConfigured,
      provider: "cached",
      message: "Invoice was already emailed.",
    };
  }
  if (!force && reason === "paid" && stored?.paidEmailedAt) {
    return {
      ok: true,
      skipped: true,
      live: false,
      demo: !liveConfigured,
      provider: "cached",
      message: "Paid receipt was already emailed.",
    };
  }

  let pdf: Uint8Array;
  try {
    pdf = await buildInvoicePdf(invoice);
  } catch (error) {
    return {
      ok: false,
      live: false,
      demo: !liveConfigured,
      provider: "pdf",
      message: `Could not build the invoice PDF: ${(error as Error)?.message || "unknown error"}`,
    };
  }

  const base = siteBase(opts?.origin);
  const subject =
    reason === "paid"
      ? `Chap receipt ${invoice.number} — paid`
      : reason === "created"
        ? `Chap invoice ${invoice.number} — payment pending`
        : `Chap invoice ${invoice.number}`;
  const summary =
    invoice.status === "paid"
      ? "Paid in full — thank you."
      : invoice.status === "void"
        ? "This invoice has been voided."
        : "Payment is still pending.";
  const text = [
    `Hi ${invoice.customer.name},`,
    "",
    `${invoice.description}`,
    `Invoice: ${invoice.number}`,
    `Amount: ${money(invoice.amount)}`,
    `Status: ${invoice.statusLabel}. ${summary}`,
    "",
    "The PDF invoice is attached. You can also view it in your dashboard:",
    `${base}/dashboard/invoices`,
    "",
    "Questions? support@chap.co.ke",
  ].join("\n");
  const html = invoiceEmailHtml(invoice, base);

  const result = await sendNotification({
    channel: "email",
    to: invoice.customer.email,
    subject,
    message: text,
    html,
    attachments: [
      {
        filename: `Chap-${invoice.number.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf`,
        contentType: "application/pdf",
        content: Buffer.from(pdf).toString("base64"),
      },
    ],
  });

  if (result.queued) {
    // The paid receipt is a distinct document from the pending invoice.
    await markInvoiceEmailSent(invoice.id, reason === "paid" ? "paid" : "created", store).catch(() => {});
  }
  return {
    ok: result.queued,
    live: result.live,
    demo: !liveConfigured,
    provider: result.provider,
    message: result.queued
      ? `Invoice emailed to ${invoice.customer.email}.`
      : !liveConfigured
        ? "Email provider is not configured (demo mode): the invoice was generated and logged, not delivered."
        : `Email delivery failed (${result.provider}). Download the PDF from the invoice list instead.`,
  };
}
