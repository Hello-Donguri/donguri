import "server-only";

import { siteUrl } from "@/lib/email";

// The shared look of every Donguri email: the wordmark, one rounded card,
// and a small footer. Table-based with inline styles, which is what email
// clients reliably render.

// The app's palette (app/globals.css, light theme). Emails can't use CSS
// variables or the site stylesheet, so the colours are inlined here.
export const COLORS = {
  page: "#faf4e9", // washi
  card: "#fffcf4", // raised
  border: "#c9d3c5", // card-border
  ink: "#160d04", // sumi
  muted: "#2f3e35", // sumi-soft
  button: "#1a54c4", // ai
  buttonText: "#faf4e9", // washi
  gold: "#ffb800", // kin
  goldSoft: "#fff4d6",
};

export const FONT = "'Nunito', 'Helvetica Neue', Arial, sans-serif";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Where every email's "manage notifications" link goes — the email
// switches in account settings.
export function notificationSettingsUrl(): string {
  return `${siteUrl()}/dashboard/settings#notifications`;
}

// A pill above the heading, e.g. "👑 Weekly leaderboard".
export function emailBadge(label: string): string {
  return `<div style="display:inline-block;background:${COLORS.goldSoft};border:1px solid ${COLORS.gold};border-radius:999px;padding:4px 14px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.ink};">
              ${label}
            </div>`;
}

// The main call to action.
export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${COLORS.button};color:${COLORS.buttonText};font-family:${FONT};font-size:16px;font-weight:800;text-decoration:none;border-radius:999px;padding:14px 32px;">
              ${label}
            </a>`;
}

// A whole email: `card` is the HTML inside the rounded card (the mascot is
// added above it), `footer` the small print under it.
export function emailLayout({ subject, card, footer }: { subject: string; card: string; footer: string }): string {
  const site = siteUrl();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:20px;font-family:${FONT};font-size:22px;font-weight:800;color:${COLORS.ink};">
            Donguri
          </td>
        </tr>
        <tr>
          <td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:24px;padding:32px 28px;text-align:center;">
            <img src="${site}/images/mascot.png" width="96" height="101" alt="" style="display:block;margin:0 auto 12px;border:0;">
            ${card}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 12px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.muted};">
            ${footer}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
