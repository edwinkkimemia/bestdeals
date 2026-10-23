/** Notification abstraction: Resend/SendGrid/ZeptoMail email + Africa's Talking/Twilio SMS.
 * Console-logged ONLY when no provider keys are set (demo mode).
 */

export type Channel = "email" | "sms" | "whatsapp";

export type NotificationAttachment = {
  filename: string;
  /** Base64-encoded bytes. */
  content: string;
  contentType?: string;
};

export function isNotifyLive(channel: Channel): boolean {
  if (channel === "email") return Boolean(process.env.EMAIL_PROVIDER && process.env.EMAIL_API_KEY);
  return Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY);
}

async function sendEmail(
  to: string,
  subject: string,
  message: string,
  opts?: { html?: string; attachments?: NotificationAttachment[] }
): Promise<{ ok: boolean; provider: string; error?: string }> {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  const key = process.env.EMAIL_API_KEY || "";
  if (!provider || !key) return { ok: false, provider: "log" };
  try {
    if (provider === "resend") {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Chap <info@chap.co.ke>",
          to,
          subject,
          text: message,
          ...(opts?.html ? { html: opts.html } : {}),
          ...(opts?.attachments?.length
            ? {
                attachments: opts.attachments.map((a) => ({
                  filename: a.filename,
                  content: a.content,
                  ...(a.contentType ? { content_type: a.contentType } : {}),
                })),
              }
            : {}),
        }),
      });
      if (!r.ok) {
        const err = (await r.text().catch(() => "")).slice(0, 300);
        console.log(`[notify:email:resend:failed] status=${r.status} to=${to} err=${err}`);
        return { ok: false, provider: "resend", error: err };
      }
      return { ok: true, provider: "resend" };
    }
    if (provider === "sendgrid") {
      // SendGrid accepts "Name <email@domain>" for from.email only when it is
      // split into email/name fields. Keep the configured value simple.
      const from = process.env.EMAIL_FROM || "info@chap.co.ke";
      const fromMatch = from.match(/^(.*)<([^>]+)>\s*$/);
      const fromEmail = (fromMatch ? fromMatch[2] : from).trim();
      const fromName = (fromMatch ? fromMatch[1] : "").trim().replace(/^"|"$/g, "");
      const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail, ...(fromName ? { name: fromName.slice(0, 60) } : {}) },
          subject,
          content: [
            { type: "text/plain", value: message },
            ...(opts?.html ? [{ type: "text/html", value: opts.html }] : []),
          ],
          ...(opts?.attachments?.length
            ? {
                attachments: opts.attachments.map((a) => ({
                  content: a.content,
                  filename: a.filename,
                  type: a.contentType || "application/octet-stream",
                  disposition: "attachment",
                })),
              }
            : {}),
        }),
      });
      if (!r.ok) {
        const err = (await r.text().catch(() => "")).slice(0, 300);
        console.log(`[notify:email:sendgrid:failed] status=${r.status} to=${to} err=${err}`);
        return { ok: false, provider: "sendgrid", error: err };
      }
      return { ok: true, provider: "sendgrid" };
    }
    if (provider === "zeptomail") {
      // Zoho ZeptoMail: EMAIL_API_KEY is the agent's Send Mail Token
      // (ZeptoMail → Agent → SMTP/API → copy Send Mail Token).
      const fromRaw = process.env.EMAIL_FROM || "Chap <info@chap.co.ke>";
      const m = fromRaw.match(/^(.*)<([^>]+)>\s*$/);
      const fromAddr = (m ? m[2] : fromRaw).trim();
      const fromName = ((m ? m[1] : "").trim().replace(/^"|"$/g, "") || "Chap").slice(0, 60);
      const esc = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const r = await fetch("https://api.zeptomail.com/v1.1/email", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Zoho-enczapikey ${key}` },
        body: JSON.stringify({
          from: { address: fromAddr, name: fromName },
          to: [{ email_address: { address: to } }],
          subject,
          textbody: message,
          htmlbody: opts?.html || `<div>${esc.replace(/\n/g, "<br>")}</div>`,
          ...(opts?.attachments?.length
            ? {
                attachments: opts.attachments.map((a) => ({
                  content: a.content,
                  mime_type: a.contentType || "application/octet-stream",
                  name: a.filename,
                })),
              }
            : {}),
        }),
      });
      if (!r.ok) {
        const err = (await r.text().catch(() => "")).slice(0, 300);
        console.log(`[notify:email:zeptomail:failed] status=${r.status} to=${to} err=${err}`);
        return { ok: false, provider: "zeptomail", error: err };
      }
      return { ok: true, provider: "zeptomail" };
    }
    console.log(`[notify:email:${provider}] to=${to} (no adapter — logged only)`);
    return { ok: false, provider };
  } catch {
    return { ok: false, provider };
  }
}

async function sendSms(to: string, message: string): Promise<{ ok: boolean; provider: string }> {
  const provider = (process.env.SMS_PROVIDER || "").toLowerCase();
  const key = process.env.SMS_API_KEY || "";
  if (!provider || !key) return { ok: false, provider: "log" };
  try {
    if (provider === "africastalking") {
      const params = new URLSearchParams({ username: process.env.SMS_USERNAME || "chap", to, message, from: process.env.SMS_SENDER_ID || "Chap" });
      const r = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: { apiKey: key, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      return { ok: r.ok, provider: "africastalking" };
    }
    if (provider === "twilio") {
      const sid = process.env.SMS_SID || "";
      const from = process.env.SMS_SENDER_ID || "";
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${key}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
      });
      return { ok: r.ok, provider: "twilio" };
    }
    console.log(`[notify:sms:${provider}] to=${to} (no adapter — logged only)`);
    return { ok: false, provider };
  } catch {
    return { ok: false, provider };
  }
}

export async function sendNotification(opts: {
  channel: Channel;
  to: string;
  subject?: string;
  message: string;
  /** Optional responsive HTML body. All built-in email adapters support it. */
  html?: string;
  /** Optional attachments. Content is base64-encoded bytes. */
  attachments?: NotificationAttachment[];
}): Promise<{ queued: boolean; provider: string; live: boolean }> {
  // WhatsApp deep-links stay seller-approved numbers only; provider send is SMS-based.
  if (opts.channel === "email") {
    const r = await sendEmail(opts.to, opts.subject || "Chap", opts.message, {
      html: opts.html,
      attachments: opts.attachments,
    });
    if (!r.ok) console.log(`[notify:email] to=${opts.to} msg=${opts.message.slice(0, 140)}`);
    return { queued: r.ok, provider: r.provider, live: r.ok };
  }
  const r = await sendSms(opts.to, opts.message);
  if (!r.ok) console.log(`[notify:${opts.channel}] to=${opts.to} msg=${opts.message.slice(0, 140)}`);
  return { queued: r.ok, provider: r.provider, live: r.ok };
}

/** Fire-and-forget: never block checkout/chat on comms. Retried by lib/queue. */
export function notifyLater(opts: { channel: Channel; to: string; subject?: string; message: string }): void {
  void import("./queue").then(({ enqueue }) => enqueue("notify", { ...opts })).catch(() => {});
}
