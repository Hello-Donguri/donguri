// Subscription statuses that unlock members-only content. `past_due` stays
// in so a failed renewal doesn't lock someone out while Stripe retries the
// card (Smart Retries); once retries run out it moves to `unpaid` or
// `canceled` and access ends. Kept apart from lib/billing.ts (which pulls
// in Stripe) so lib/access.ts can use it anywhere.
const ACCESS_STATUSES = new Set(["trialing", "active", "past_due"]);

export function hasActiveAccess(
  role: string,
  subscription: { status: string | null } | null,
): boolean {
  // Admins, and testers (see UserRole in lib/definitions.ts), without
  // needing a subscription.
  if (role === "admin" || role === "tester") return true;
  return subscription?.status != null && ACCESS_STATUSES.has(subscription.status);
}
