import { EndStaleSession } from "@/components/auth/end-stale-session";

// Where a session whose user no longer exists is sent — a guest that's been
// merged into a real account or cleaned up (see requireProfile in
// lib/dal.ts). Clears it and starts afresh on the home page.
export default function SignOutPage() {
  return <EndStaleSession />;
}
