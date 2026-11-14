import en from "./locales/en.json";
import ja from "./locales/ja.json";
import type { Locale } from "./config";

export type Dictionary = Record<string, string>;

const DICTIONARIES: Record<Locale, Dictionary> = { en, ja };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

// What client components are sent (see LocaleProvider) — it's part of
// every page's HTML, so only what changes anything: an empty or missing
// entry falls back to the English written at the call site anyway. That
// makes English nothing at all (en.json is generated from those very
// fallbacks — see scripts/i18n-extract.mjs), and Japanese just the entries
// that have been translated.
const CLIENT_DICTIONARIES: Record<Locale, Dictionary> = {
  en: {},
  ja: Object.fromEntries(Object.entries(ja).filter(([, value]) => value !== "")),
};

export function getClientDictionary(locale: Locale): Dictionary {
  return CLIENT_DICTIONARIES[locale];
}
