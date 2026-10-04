import "server-only";

import { cookies } from "next/headers";

// The session's own cookies — `sb-<project>-auth-token`, split into `.0`,
// `.1`, ... when large — but not `sb-<project>-auth-token-code-verifier`,
// which an email sign-up still needs when its confirmation link comes back
// (see app/auth/confirm). Supabase's signOut() removes that too, so this is
// for dropping a session while a confirmation may still be on its way.
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (SESSION_COOKIE.test(cookie.name)) store.delete(cookie.name);
  }
}
