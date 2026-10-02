"use server";

import { requireAdminProfile } from "@/lib/dal";
import { emailConfigured, sendEmail } from "@/lib/email";
import { regainCrownEmail } from "@/lib/emails/regain-crown";

export type TestEmailResult =
  | { ok: true; to: string }
  | { ok: false; reason: "not_configured" | "failed" };

// Dev mode's "Send test crown email": the real "regain your crown" email,
// with made-up numbers and rival, to the signed-in admin — for checking how
// it looks in an actual inbox and that the SMTP settings work. Admins only.
export async function sendTestCrownEmail(): Promise<TestEmailResult> {
  const profile = await requireAdminProfile();
  if (!emailConfigured()) return { ok: false, reason: "not_configured" };

  const sent = await sendEmail(
    regainCrownEmail({
      to: profile.email,
      name: profile.first_name ?? profile.username ?? "there",
      newLeader: "test_rival",
      theirXp: 42.5,
      yourXp: 38,
    }),
  );
  return sent ? { ok: true, to: profile.email } : { ok: false, reason: "failed" };
}
