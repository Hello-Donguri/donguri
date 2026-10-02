import "server-only";

import { formatXp } from "@/lib/levels";
import { siteUrl, type Email } from "@/lib/email";

// The app's palette (app/globals.css, light theme). Emails can't use CSS
// variables or the site stylesheet, so the colours are inlined here.
const COLORS = {
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

const FONT = "'Nunito', 'Helvetica Neue', Arial, sans-serif";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "Regain your crown": sent to whoever was #1 on the weekly XP leaderboard
// when someone overtakes them (see lib/weekly-crown.ts). Table-based with
// inline styles, which is what email clients reliably render.
export function regainCrownEmail({
  to,
  name,
  newLeader,
  theirXp,
  yourXp,
}: {
  to: string;
  // The overtaken learner's first name, or their username.
  name: string;
  // The username of who took the top spot.
  newLeader: string;
  theirXp: number;
  yourXp: number;
}): Email {
  const site = siteUrl();
  const gap = Math.max(0, theirXp - yourXp);
  const subject = `👑 @${newLeader} took your crown — win it back!`;

  const text = [
    `Regain your crown, ${name}!`,
    "",
    `@${newLeader} just took the top spot on this week's leaderboard with ${formatXp(theirXp)} XP. You're on ${formatXp(yourXp)} XP — just ${formatXp(gap)} behind.`,
    "",
    "A quick review or today's daily challenge could win it back.",
    "",
    `Win it back: ${site}/dashboard`,
    "",
    `Don't want these emails? Turn them off in your account settings: ${site}/dashboard/settings`,
  ].join("\n");

  const html = `<!doctype html>
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
            <div style="display:inline-block;background:${COLORS.goldSoft};border:1px solid ${COLORS.gold};border-radius:999px;padding:4px 14px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.ink};">
              👑 Weekly leaderboard
            </div>
            <h1 style="margin:16px 0 8px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:800;color:${COLORS.ink};">
              Regain your crown, ${escapeHtml(name)}!
            </h1>
            <p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.muted};">
              <strong style="color:${COLORS.ink};">@${escapeHtml(newLeader)}</strong> just took the top spot on this week's leaderboard.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td width="50%" style="padding:0 6px 0 0;">
                  <div style="background:${COLORS.goldSoft};border-radius:16px;padding:14px 8px;font-family:${FONT};">
                    <div style="font-size:24px;font-weight:800;color:${COLORS.ink};">${formatXp(theirXp)} XP</div>
                    <div style="font-size:12px;color:${COLORS.muted};">@${escapeHtml(newLeader)}</div>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 0 6px;">
                  <div style="background:${COLORS.page};border:1px solid ${COLORS.border};border-radius:16px;padding:14px 8px;font-family:${FONT};">
                    <div style="font-size:24px;font-weight:800;color:${COLORS.ink};">${formatXp(yourXp)} XP</div>
                    <div style="font-size:12px;color:${COLORS.muted};">You</div>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.muted};">
              You're just <strong style="color:${COLORS.ink};">${formatXp(gap)} XP</strong> behind. A quick review or today's daily challenge could win it back.
            </p>
            <a href="${site}/dashboard" style="display:inline-block;background:${COLORS.button};color:${COLORS.buttonText};font-family:${FONT};font-size:16px;font-weight:800;text-decoration:none;border-radius:999px;padding:14px 32px;">
              Win it back →
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 12px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.muted};">
            You're getting this because you were top of the weekly leaderboard.<br>
            <a href="${site}/dashboard/settings" style="color:${COLORS.muted};text-decoration:underline;">Turn these emails off</a> in your account settings.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { to, subject, html, text };
}
