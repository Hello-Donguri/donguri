import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestInto, takeRememberedGuest } from "@/lib/guest-merge";

// Where Google / LINE send the user back to after signInWithOAuth (see
// lib/actions/auth.ts). Exchanges the one-time code for a session. The
// profile row itself comes from the `handle_new_user` trigger, and a
// first-time user has no username yet, so requireProfile sends them on to
// /onboarding from the dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Signing in from a guest session (see lib/guest-merge.ts): bring
      // what they learnt along.
      const guestId = await takeRememberedGuest();
      if (guestId) await mergeGuestInto(guestId, data.user.id);

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("OAuth code exchange failed:", error);
  } else if (searchParams.get("error")) {
    // The user cancelled on the provider's consent screen, or the provider
    // refused — Supabase forwards its error here instead of a code.
    console.error(
      "OAuth provider returned an error:",
      searchParams.get("error_description") ?? searchParams.get("error"),
    );
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}

// Only ever redirect within this site — `next` comes from the URL.
function safeNextPath(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}
