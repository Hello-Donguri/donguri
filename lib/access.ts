// Who can learn how much. Three tiers:
//   - guest:  learning from the home page without an account (a Supabase
//             anonymous user — see section 50 of supabase/schema.sql).
//             Up to GUEST_ITEM_LIMIT items, words and grammar points
//             together — three learn batches of three — then they're
//             asked to sign up.
//   - free:   a signed-up account without a membership. Up to
//             FREE_VOCAB_LIMIT words and FREE_GRAMMAR_LIMIT grammar points
//             in total — a guest's items count towards these, since they
//             carry over on sign-up (lib/guest-merge.ts).
//   - member: an active (or past_due) Stripe subscription, or an admin.
//             No limits, plus the daily challenge.
// The limits are on *learning new items* only: reviews and quizzes of what
// someone has already learnt stay open on every tier. Items skipped as
// already known ("I know this") don't count — they're never taught.

import { hasActiveAccess } from "@/lib/billing-status";

export type AccessTier = "guest" | "free" | "member";

export const GUEST_ITEM_LIMIT = 9;
export const FREE_VOCAB_LIMIT = 12;
export const FREE_GRAMMAR_LIMIT = 0;

export function accessTier(
  role: string,
  isGuest: boolean,
  subscription: { status: string | null } | null,
): AccessTier {
  if (hasActiveAccess(role, subscription)) return "member";
  return isGuest ? "guest" : "free";
}

// How many more new items of each kind someone may learn — null meaning
// unlimited. `total` caps vocab and grammar together (guests only).
export type Allowance = {
  tier: AccessTier;
  used: { vocab: number; grammar: number };
  remaining: {
    vocab: number | null;
    grammar: number | null;
    total: number | null;
  };
};

export function allowanceFor(
  tier: AccessTier,
  used: { vocab: number; grammar: number },
): Allowance {
  if (tier === "member") {
    return {
      tier,
      used,
      remaining: { vocab: null, grammar: null, total: null },
    };
  }

  const vocab = Math.max(0, FREE_VOCAB_LIMIT - used.vocab);
  const grammar = Math.max(0, FREE_GRAMMAR_LIMIT - used.grammar);

  if (tier === "free") {
    return { tier, used, remaining: { vocab, grammar, total: null } };
  }

  const total = Math.max(0, GUEST_ITEM_LIMIT - used.vocab - used.grammar);
  return {
    tier,
    used,
    remaining: {
      vocab: Math.min(vocab, total),
      grammar: Math.min(grammar, total),
      total,
    },
  };
}

// The first items of `items` (already in the order they'd be taught) that
// still fit the allowance — e.g. a guest with one item left gets one word
// of a three-word batch.
export function withinAllowance<T extends { path: string }>(
  items: T[],
  allowance: Allowance,
): T[] {
  let { vocab, grammar, total } = allowance.remaining;
  const picked: T[] = [];

  for (const item of items) {
    if (total !== null && total <= 0) break;
    const isGrammar = item.path === "grammar";
    const left = isGrammar ? grammar : vocab;
    if (left !== null && left <= 0) continue;

    picked.push(item);
    if (total !== null) total -= 1;
    if (isGrammar) grammar = grammar === null ? null : grammar - 1;
    else vocab = vocab === null ? null : vocab - 1;
  }

  return picked;
}
