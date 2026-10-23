/**
 * Branded A4 invoice PDFs. Everything is drawn locally with pdf-lib and the
 * embedded wordmark, so no browser, headless Chrome or external font service
 * is needed in serverless functions.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CHAP_LOGO_PNG_BASE64 } from "./invoice-logo";
import { invoiceDateLabel, type InvoiceView } from "./invoices";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;

const BRAND = rgb(0, 67 / 255, 210 / 255);
const BRAND_DARK = rgb(11 / 255, 20 / 255, 55 / 255);
const ACCENT = rgb(254 / 255, 17 / 255, 35 / 255);
const INK = rgb(16 / 255, 24 / 255, 18 / 255);
const MUTED = rgb(91 / 255, 106 / 255, 99 / 255);
const FAINT = rgb(125 / 255, 140 / 255, 134 / 255);
const BORDER = rgb(226 / 255, 232 / 255, 240 / 255);
const PANEL = rgb(247 / 255, 249 / 255, 252 / 255);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(21 / 255, 128 / 255, 61 / 255);
const GREEN_BG = rgb(220 / 255, 252 / 255, 231 / 255);
const AMBER = rgb(180 / 255, 83 / 255, 9 / 255);
const AMBER_BG = rgb(254 / 255, 243 / 255, 199 / 255);
const RED_BG = rgb(254 / 255, 242 / 255, 242 / 255);

function money(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

function clean(text: string): string {
  return text
    .replace(/\u2014|\u2013/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
}

function widthOf(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(clean(text), size);
}

function draw(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb> }
): void {
  page.drawText(clean(text), {
    x: opts.x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? INK,
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, font, size) <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
    maxWidth: number;
    lineHeight?: number;
    maxLines?: number;
  }
): number {
  const lines = wrap(text, opts.font, opts.size, opts.maxWidth).slice(0, opts.maxLines ?? 3);
  let y = opts.y;
  for (const line of lines) {
    draw(page, line, {
      x: opts.x,
      y,
      size: opts.size,
      font: opts.font,
      color: opts.color,
    });
    y -= opts.lineHeight ?? opts.size * 1.35;
  }
  return y;
}

function drawStatusPill(
  page: PDFPage,
  label: string,
  status: InvoiceView["status"],
  x: number,
  y: number,
  bold: PDFFont
): void {
  const bg = status === "paid" ? GREEN_BG : status === "pending" ? AMBER_BG : RED_BG;
  const fg = status === "paid" ? GREEN : status === "pending" ? AMBER : ACCENT;
  const text = label.toUpperCase();
  const paddingX = 11;
  const w = widthOf(text, bold, 7.5) + paddingX * 2;
  page.drawRectangle({ x, y, width: w, height: 22, color: bg });
  draw(page, text, { x: x + paddingX, y: y + 7.2, size: 7.5, font: bold, color: fg });
}

function drawKeyValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  regular: PDFFont,
  bold: PDFFont
): void {
  draw(page, label.toUpperCase(), { x, y, size: 7, font: bold, color: FAINT });
  drawWrapped(page, value, {
    x,
    y: y - 13,
    size: 8.7,
    font: regular,
    color: INK,
    maxWidth,
    lineHeight: 11.5,
    maxLines: 2,
  });
}

function drawSummaryRow(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  regular: PDFFont,
  bold: PDFFont,
  strong = false
): void {
  draw(page, label, { x, y, size: strong ? 9 : 8.5, font: strong ? bold : regular, color: strong ? INK : MUTED });
  const valueWidth = widthOf(value, strong ? bold : regular, strong ? 10 : 8.5);
  draw(page, value, {
    x: x + width - valueWidth,
    y,
    size: strong ? 10 : 8.5,
    font: strong ? bold : regular,
    color: strong ? INK : INK,
  });
}

/**
 * Build and return an A4 invoice PDF. Callers can stream the Uint8Array
 * directly to the browser or base64-encode it as an email attachment.
 */
export async function buildInvoicePdf(invoice: InvoiceView): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Chap invoice ${invoice.number}`);
  pdf.setAuthor("chap.co.ke");
  pdf.setSubject(invoice.description);
  pdf.setCreator("chap.co.ke");
  pdf.setProducer("chap.co.ke");

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(Buffer.from(CHAP_LOGO_PNG_BASE64, "base64"));
  const right = PAGE_WIDTH - MARGIN;

  // Header: crisp white space, brand rule and the embedded wordmark.
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 7, width: PAGE_WIDTH, height: 7, color: BRAND });
  page.drawRectangle({ x: PAGE_WIDTH - 148, y: PAGE_HEIGHT - 7, width: 148, height: 7, color: ACCENT });
  page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - 89, width: 168, height: 42 });
  draw(page, "Kenya's marketplace for everything", { x: MARGIN, y: PAGE_HEIGHT - 108, size: 8, font: regular, color: MUTED });
  draw(page, "chap.co.ke  |  support@chap.co.ke", { x: MARGIN, y: PAGE_HEIGHT - 121, size: 8, font: regular, color: MUTED });

  const title = "INVOICE";
  draw(page, title, {
    x: right - widthOf(title, bold, 27),
    y: PAGE_HEIGHT - 73,
    size: 27,
    font: bold,
    color: BRAND,
  });
  const pillLabel = invoice.status === "paid" ? "Paid" : invoice.status === "void" ? "Void" : "Unpaid";
  const pillWidth = widthOf(pillLabel.toUpperCase(), bold, 7.5) + 22;
  drawStatusPill(page, pillLabel, invoice.status, right - pillWidth, PAGE_HEIGHT - 99, bold);

  // Billing parties and invoice metadata.
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 142 },
    end: { x: right, y: PAGE_HEIGHT - 142 },
    thickness: 0.8,
    color: BORDER,
  });
  draw(page, "BILLED TO", { x: MARGIN, y: PAGE_HEIGHT - 160, size: 7.2, font: bold, color: BRAND });
  let billY = PAGE_HEIGHT - 179;
  billY = drawWrapped(page, invoice.customer.name, {
    x: MARGIN,
    y: billY,
    size: 12.5,
    font: bold,
    color: INK,
    maxWidth: 260,
    lineHeight: 15,
    maxLines: 2,
  }) - 2;
  if (invoice.customer.businessName && invoice.customer.businessName !== invoice.customer.name) {
    draw(page, invoice.customer.businessName, { x: MARGIN, y: billY, size: 8.4, font: regular, color: MUTED });
    billY -= 13;
  }
  if (invoice.customer.email) {
    draw(page, invoice.customer.email, { x: MARGIN, y: billY, size: 8.4, font: regular, color: MUTED });
    billY -= 13;
  }
  if (invoice.customer.phone) {
    draw(page, invoice.customer.phone, { x: MARGIN, y: billY, size: 8.4, font: regular, color: MUTED });
    billY -= 13;
  }
  if (invoice.shop) {
    draw(page, `Shop: ${invoice.shop.name}`, { x: MARGIN, y: billY, size: 8.4, font: regular, color: MUTED });
  }

  const metaX = 366;
  drawKeyValue(page, "Invoice no.", invoice.number, metaX, PAGE_HEIGHT - 160, right - metaX, regular, bold);
  drawKeyValue(page, "Issued", invoiceDateLabel(invoice.issuedAt), metaX, PAGE_HEIGHT - 199, right - metaX, regular, bold);
  drawKeyValue(
    page,
    invoice.status === "paid" ? "Paid" : "Due",
    invoiceDateLabel(invoice.status === "paid" ? invoice.paidAt : invoice.dueAt),
    metaX,
    PAGE_HEIGHT - 238,
    right - metaX,
    regular,
    bold
  );

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 282 },
    end: { x: right, y: PAGE_HEIGHT - 282 },
    thickness: 0.8,
    color: BORDER,
  });

  // Line-item table.
  const tableTop = PAGE_HEIGHT - 308;
  page.drawRectangle({ x: MARGIN, y: tableTop, width: right - MARGIN, height: 25, color: BRAND });
  draw(page, "DESCRIPTION", { x: MARGIN + 12, y: tableTop + 8.5, size: 7.2, font: bold, color: WHITE });
  draw(page, "QTY", { x: 406, y: tableTop + 8.5, size: 7.2, font: bold, color: WHITE });
  draw(page, "AMOUNT", { x: right - 54, y: tableTop + 8.5, size: 7.2, font: bold, color: WHITE });

  let rowY = tableTop - 24;
  for (const item of invoice.lineItems) {
    const descriptionLines = wrap(item.description, bold, 9.5, 318);
    const detailLines = item.detail ? wrap(item.detail, regular, 8.1, 318) : [];
    const rowHeight = Math.max(47, 19 + descriptionLines.length * 12 + detailLines.length * 11);
    draw(page, "1", { x: 410, y: rowY, size: 8.5, font: regular, color: MUTED });
    const amount = money(item.amount);
    draw(page, amount, {
      x: right - widthOf(amount, bold, 9.2),
      y: rowY,
      size: 9.2,
      font: bold,
      color: INK,
    });
    let lineY = rowY;
    for (const line of descriptionLines.slice(0, 3)) {
      draw(page, line, { x: MARGIN + 12, y: lineY, size: 9.5, font: bold, color: INK });
      lineY -= 12;
    }
    for (const line of detailLines.slice(0, 3)) {
      draw(page, line, { x: MARGIN + 12, y: lineY, size: 8.1, font: regular, color: MUTED });
      lineY -= 11;
    }
    rowY -= rowHeight;
    page.drawLine({
      start: { x: MARGIN, y: rowY + 14 },
      end: { x: right, y: rowY + 14 },
      thickness: 0.6,
      color: BORDER,
    });
  }

  // Summary and payment details.
  const summaryTop = Math.max(330, rowY - 26);
  const panelX = 332;
  const panelW = right - panelX;
  const paid = invoice.status === "paid";
  const balance = invoice.status === "pending" ? invoice.amount : 0;
  const tallyColor = invoice.status === "pending" ? AMBER : GREEN;

  page.drawRectangle({ x: panelX, y: summaryTop - 154, width: panelW, height: 154, color: PANEL });
  draw(page, "SUMMARY", { x: panelX + 15, y: summaryTop - 23, size: 7, font: bold, color: FAINT });
  drawSummaryRow(page, "Subtotal", money(invoice.amount), panelX + 15, summaryTop - 43, panelW - 30, regular, bold);
  drawSummaryRow(page, "Tax", "Included", panelX + 15, summaryTop - 59, panelW - 30, regular, bold);
  page.drawLine({
    start: { x: panelX + 15, y: summaryTop - 71 },
    end: { x: right - 15, y: summaryTop - 71 },
    thickness: 0.7,
    color: BORDER,
  });
  page.drawRectangle({ x: panelX + 15, y: summaryTop - 98, width: panelW - 30, height: 28, color: BRAND });
  draw(page, "TOTAL", { x: panelX + 25, y: summaryTop - 88.5, size: 7.2, font: bold, color: WHITE });
  const totalMoney = money(invoice.amount);
  draw(page, totalMoney, {
    x: right - 25 - widthOf(totalMoney, bold, 12),
    y: summaryTop - 91,
    size: 12,
    font: bold,
    color: WHITE,
  });
  drawSummaryRow(
    page,
    "Amount paid",
    money(paid ? invoice.amount : 0),
    panelX + 15,
    summaryTop - 116,
    panelW - 30,
    regular,
    bold
  );
  draw(page, "Balance due", { x: panelX + 15, y: summaryTop - 134, size: 8.5, font: bold, color: INK });
  draw(page, money(balance), {
    x: right - 15 - widthOf(money(balance), bold, 10),
    y: summaryTop - 134,
    size: 10,
    font: bold,
    color: tallyColor,
  });

  page.drawRectangle({ x: MARGIN, y: summaryTop - 154, width: 263, height: 154, color: PANEL });
  draw(page, "PAYMENT DETAILS", { x: MARGIN + 15, y: summaryTop - 23, size: 7, font: bold, color: FAINT });
  draw(page, "Method", { x: MARGIN + 15, y: summaryTop - 44, size: 8.1, font: regular, color: MUTED });
  draw(page, invoice.methodLabel, { x: MARGIN + 89, y: summaryTop - 44, size: 8.6, font: bold, color: INK });
  draw(page, "Reference", { x: MARGIN + 15, y: summaryTop - 62, size: 8.1, font: regular, color: MUTED });
  draw(page, invoice.reference || "Not issued", { x: MARGIN + 89, y: summaryTop - 62, size: 8.6, font: regular, color: INK });
  draw(page, paid ? "Paid on" : "Due on", {
    x: MARGIN + 15,
    y: summaryTop - 80,
    size: 8.1,
    font: regular,
    color: MUTED,
  });
  draw(page, invoiceDateLabel(paid ? invoice.paidAt : invoice.dueAt) || "-", {
    x: MARGIN + 89,
    y: summaryTop - 80,
    size: 8.6,
    font: regular,
    color: INK,
  });
  const statusLine =
    invoice.status === "paid" ? "Paid in full" : invoice.status === "void" ? "Voided" : "Awaiting payment";
  draw(page, statusLine, {
    x: MARGIN + 15,
    y: summaryTop - 112,
    size: 8.8,
    font: bold,
    color: invoice.status === "paid" ? GREEN : invoice.status === "void" ? ACCENT : AMBER,
  });

  // Notes.
  const notesY = summaryTop - 184;
  draw(page, "NOTES", { x: MARGIN, y: notesY, size: 7, font: bold, color: FAINT });
  const note =
    invoice.status === "paid"
      ? "Payment received in full. Thank you for choosing Chap."
      : invoice.status === "void"
        ? "This invoice has been voided. No further payment is due for this item."
        : "This invoice is unpaid. Complete the M-Pesa prompt or pay from your Chap wallet to activate this item.";
  let noteY = drawWrapped(page, note, {
    x: MARGIN,
    y: notesY - 17,
    size: 8.5,
    font: regular,
    color: MUTED,
    maxWidth: 500,
    lineHeight: 12,
    maxLines: 2,
  });
  drawWrapped(
    page,
    "This is a computer-generated invoice and does not require a signature. Questions? Contact support@chap.co.ke.",
    {
      x: MARGIN,
      y: noteY - 3,
      size: 7.6,
      font: regular,
      color: FAINT,
      maxWidth: 500,
      lineHeight: 10.5,
      maxLines: 2,
    }
  );

  // A compact support card balances the lower third and gives the recipient a
  // clear next step without adding another page.
  page.drawRectangle({ x: MARGIN, y: 112, width: right - MARGIN, height: 58, color: rgb(238 / 255, 243 / 255, 255 / 255) });
  page.drawRectangle({ x: MARGIN, y: 112, width: 4, height: 58, color: BRAND });
  draw(page, "Need help with billing?", { x: MARGIN + 16, y: 148, size: 9, font: bold, color: BRAND });
  draw(page, "Email support@chap.co.ke or open Dashboard -> Invoices for all receipts.", {
    x: MARGIN + 16,
    y: 133,
    size: 7.8,
    font: regular,
    color: MUTED,
  });
  draw(page, "Keep this PDF for your records.", {
    x: right - 15 - widthOf("Keep this PDF for your records.", regular, 7.8),
    y: 140,
    size: 7.8,
    font: regular,
    color: FAINT,
  });

  // Footer.
  page.drawLine({ start: { x: MARGIN, y: 68 }, end: { x: right, y: 68 }, thickness: 0.7, color: BORDER });
  draw(page, "chap.co.ke  |  Kenya's marketplace for everything", {
    x: MARGIN,
    y: 51,
    size: 7.5,
    font: regular,
    color: FAINT,
  });
  const pageLabel = "Page 1 of 1";
  draw(page, pageLabel, {
    x: right - widthOf(pageLabel, regular, 7.5),
    y: 51,
    size: 7.5,
    font: regular,
    color: FAINT,
  });

  // Keep TypeScript from flagging the semantic dark ink colour as unused if the
  // layout later drops a dark heading; it is intentionally part of the palette.
  void BRAND_DARK;

  return pdf.save();
}
