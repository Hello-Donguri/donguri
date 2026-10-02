import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

// Outgoing mail through the no-reply SMTP account (NO_REPLY_EMAIL_* in
// .env). Port 465 is SMTP over TLS from the first byte; anything else
// upgrades with STARTTLS. Without the settings, emails are logged instead
// of sent, so local development works without an inbox.
let transporter: Transporter | null = null;

// Whether the no-reply SMTP account is set up, i.e. emails really send.
export function emailConfigured(): boolean {
  return Boolean(
    process.env.NO_REPLY_EMAIL_HOST && process.env.NO_REPLY_EMAIL_ADDRESS && process.env.NO_REPLY_EMAIL_PASSWORD,
  );
}

function getTransporter(): Transporter | null {
  const host = process.env.NO_REPLY_EMAIL_HOST;
  const user = process.env.NO_REPLY_EMAIL_ADDRESS;
  const pass = process.env.NO_REPLY_EMAIL_PASSWORD;
  if (!host || !user || !pass) return null;

  if (!transporter) {
    const port = Number(process.env.NO_REPLY_EMAIL_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export type Email = {
  to: string;
  subject: string;
  html: string;
  // The plain-text version, for clients that don't show HTML.
  text: string;
};

// Sends one email from Donguri's no-reply address. Returns whether it went;
// failures are logged rather than thrown, since every email here is a nice
// extra that must never break what triggered it.
export async function sendEmail(email: Email): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.info(`[email not sent — NO_REPLY_EMAIL_* not set] To ${email.to}: ${email.subject}`);
    return false;
  }

  try {
    await transport.sendMail({
      from: `"Donguri" <${process.env.NO_REPLY_EMAIL_ADDRESS}>`,
      ...email,
    });
    return true;
  } catch (error) {
    console.error("Email failed to send:", error);
    return false;
  }
}

// The app's absolute URL, for links and images in emails.
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
