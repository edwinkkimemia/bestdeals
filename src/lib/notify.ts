/** Notification abstraction: email/SMS/WhatsApp via approved providers. Console-logged in demo mode. */

export type Channel = "email" | "sms" | "whatsapp";

export async function sendNotification(opts: {
  channel: Channel;
  to: string;
  subject?: string;
  message: string;
}): Promise<{ queued: boolean; provider: string }> {
  const provider =
    opts.channel === "email"
      ? process.env.EMAIL_PROVIDER || "log"
      : process.env.SMS_PROVIDER || "log";
  if (provider === "log" || !provider) {
    console.log(`[notify:${opts.channel}] to=${opts.to} msg=${opts.message.slice(0, 140)}`);
    return { queued: true, provider: "log" };
  }
  // Production: plug in Resend/SendGrid/Africa's Talking/Twilio here.
  console.log(`[notify:${opts.channel}:${provider}] to=${opts.to}`);
  return { queued: true, provider };
}
