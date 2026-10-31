import "server-only";

import { cacheLife } from "next/cache";
import { FALLBACK_EXCHANGE_RATES, type ExchangeRates } from "@/lib/word-image-models";

// Today's dollar rates in pounds and yen, for showing what OpenAI calls
// cost (see formatCost) — the European Central Bank's daily reference
// rates, via Frankfurter (free, no key). Kept for a few hours; if it can't
// be reached, the rough fallback rates stand in (and aren't kept, so the
// next request tries again).
async function fetchExchangeRates(): Promise<ExchangeRates> {
  "use cache";
  cacheLife("hours");

  const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP,JPY");
  if (!response.ok) throw new Error(`Exchange rates unavailable (${response.status}).`);
  const body = (await response.json()) as { date?: string; rates?: { GBP?: number; JPY?: number } };
  const gbp = body.rates?.GBP;
  const jpy = body.rates?.JPY;
  if (!gbp || !jpy) throw new Error("Exchange rates missing from the reply.");
  return { gbp, jpy, date: body.date ?? null };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  return fetchExchangeRates().catch(() => FALLBACK_EXCHANGE_RATES);
}
