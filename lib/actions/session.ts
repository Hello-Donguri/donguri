"use server";

import { clearSessionCookies } from "@/lib/supabase/session-cookies";

// Drops this browser's session — for a session whose user no longer exists
// (see app/auth/signout). Cookies only: Supabase's signOut() would ask for
// a user that's gone (and can fail, leaving them behind), and would also
// clear a pending email sign-up's confirmation cookie.
export async function endStaleSession(): Promise<void> {
  await clearSessionCookies();
}
