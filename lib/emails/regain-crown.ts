import "server-only";

import { formatXp } from "@/lib/levels";
import { siteUrl, type Email } from "@/lib/email";
import { COLORS, FONT, emailBadge, emailButton, emailLayout, escapeHtml, notificationSettingsUrl } from "@/lib/emails/layout";

// "Regain your crown": sent to whoever was #1 on the weekly XP leaderboard
// when someone overtakes them (see lib/weekly-crown.ts), in the shared
// email layout (lib/emails/layout.ts).
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
    `Manage notifications: ${notificationSettingsUrl()}`,
  ].join("\n");

  const html = emailLayout({
    subject,
    card: `${emailBadge("👑 Weekly leaderboard")}
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
            ${emailButton(`${site}/dashboard`, "Win it back →")}`,
    footer: `You're getting this because you were top of the weekly leaderboard.<br>
            <a href="${notificationSettingsUrl()}" style="color:${COLORS.muted};text-decoration:underline;">Manage notifications</a>`,
  });

  return { to, subject, html, text };
}
