import { connection } from "next/server";
import { getProfile } from "@/lib/dal";
import { getExchangeRates } from "@/lib/exchange-rates";

// Today's dollar rates in pounds and yen, for the cost estimates in the
// admin image generator (see GenerateWordImage).
export async function GET() {
  await connection();
  const profile = await getProfile();
  if (profile?.role !== "admin") return Response.json({ error: "Admins only." }, { status: 403 });
  return Response.json(await getExchangeRates());
}
