import { connection } from "next/server";
import { getReviewDueStatus } from "@/lib/dal";

// Polled in the background by ReviewDueNotifier for the "words ready to
// review" toast. A route handler rather than a server action: the client
// runs server actions one at a time, so a background check could hold up
// a quiz answer behind it. Per-user and always fresh, never cached.
export async function GET() {
  await connection();
  return Response.json(await getReviewDueStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
