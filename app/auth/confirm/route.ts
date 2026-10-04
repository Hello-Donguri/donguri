import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Supabase's default email templates ({{ .ConfirmationURL }}) verify on
  // Supabase's side and land here with a PKCE `code`; a customised
  // template linking straight here sends `token_hash` + `type` instead.
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // A `code` means Supabase has already checked the link — the email is
    // confirmed. Signing in from it needs a cookie from the browser they
    // signed up in, so opened anywhere else (another device, an email app's
    // browser) it can't; they just need to log in.
    console.error("Email confirmation code exchange failed:", error);
    return NextResponse.redirect(`${origin}/login?notice=confirmed`);
  } else if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or a token that wouldn't verify: Supabase sends an expired or
  // already-used link here with an error instead.
  return NextResponse.redirect(`${origin}/login?notice=link_invalid`);
}
