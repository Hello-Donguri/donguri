import "server-only";

import { formatXp } from "@/lib/levels";
import { siteUrl, type Email } from "@/lib/email";
import { COLORS, FONT, emailBadge, emailButton, emailLayout, escapeHtml, notificationSettingsUrl } from "@/lib/emails/layout";

// "Someone followed you": sent when a learner gains a follower (see
// `follow` in lib/actions/friends.ts), unless they've turned it off in
// account settings. Offers to follow them back — or, when they already
// follow each other, just to see their profile.
export function newFollowerEmail({
  to,
  name,
  follower,
  followerLevel,
  followerXp,
  alreadyFollowing,
}: {
  to: string;
  // The followed learner's first name, or their username.
  name: string;
  // The follower's username.
  follower: string;
  followerLevel: number;
  followerXp: number;
  // Whether the recipient already follows them back.
  alreadyFollowing: boolean;
}): Email {
  const site = siteUrl();
  const profileUrl = `${site}/user/${encodeURIComponent(follower)}`;
  const subject = `@${follower} started following you on Donguri`;
  const callToAction = alreadyFollowing ? "See their profile →" : "Follow back →";

  const text = [
    `Hi ${name},`,
    "",
    `@${follower} (level ${followerLevel}, ${formatXp(followerXp)} XP) just started following you on Donguri.`,
    alreadyFollowing
      ? "You already follow each other — see how you compare on the leaderboard."
      : "Follow them back to compare XP on your leaderboard.",
    "",
    `${alreadyFollowing ? "See their profile" : "Follow back"}: ${profileUrl}`,
    "",
    `Manage notifications: ${notificationSettingsUrl()}`,
  ].join("\n");

  const html = emailLayout({
    subject,
    card: `${emailBadge("🌰 New follower")}
            <h1 style="margin:16px 0 8px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:800;color:${COLORS.ink};">
              You have a new follower, ${escapeHtml(name)}!
            </h1>
            <p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.muted};">
              <strong style="color:${COLORS.ink};">@${escapeHtml(follower)}</strong> just started following you.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td width="50%" style="padding:0 6px 0 0;">
                  <div style="background:${COLORS.goldSoft};border-radius:16px;padding:14px 8px;font-family:${FONT};">
                    <div style="font-size:24px;font-weight:800;color:${COLORS.ink};">Lv ${followerLevel}</div>
                    <div style="font-size:12px;color:${COLORS.muted};">@${escapeHtml(follower)}</div>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 0 6px;">
                  <div style="background:${COLORS.page};border:1px solid ${COLORS.border};border-radius:16px;padding:14px 8px;font-family:${FONT};">
                    <div style="font-size:24px;font-weight:800;color:${COLORS.ink};">${formatXp(followerXp)} XP</div>
                    <div style="font-size:12px;color:${COLORS.muted};">Total XP</div>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.muted};">
              ${
                alreadyFollowing
                  ? "You already follow each other — see how you compare on the leaderboard."
                  : "Follow them back to compare XP on your leaderboard."
              }
            </p>
            ${emailButton(profileUrl, callToAction)}`,
    footer: `You're getting this because someone followed you on Donguri.<br>
            <a href="${notificationSettingsUrl()}" style="color:${COLORS.muted};text-decoration:underline;">Manage notifications</a>`,
  });

  return { to, subject, html, text };
}
