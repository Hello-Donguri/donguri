// Test decks (`LanguageDeck.isTest` — kept for trying things out, never
// going live) are only for admins.
export function canSeeTestDecks(profile: { role: string } | null | undefined): boolean {
  return profile?.role === "admin";
}

// Spread into any learner-facing deck filter, alongside its own
// `active: true`: nothing extra for an admin, test decks left out for
// everyone else.
export function testDeckFilter(profile: { role: string } | null | undefined): { isTest?: false } {
  return canSeeTestDecks(profile) ? {} : { isTest: false };
}
