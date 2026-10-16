// One-off cleanup: example sentences saved with "*word*"/"**word**" before
// those marks were pulled out on save/import. Moves each mark into
// enHighlight/jaHighlight (an existing highlight is kept) and strips the
// asterisks from the sentence.
//
// Dry run by default, prints what would change:
//   npx tsx --env-file=.env scripts/fix-star-marked-examples.ts
// Then apply:
//   npx tsx --env-file=.env scripts/fix-star-marked-examples.ts --apply

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { withStarMark } from "../lib/star-mark";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const main = async () => {
  const rows = await prisma.wordExample.findMany({
    where: { OR: [{ en: { contains: "*" } }, { ja: { contains: "*" } }] },
    select: { id: true, en: true, ja: true, enHighlight: true, jaHighlight: true },
  });

  let changed = 0;
  for (const row of rows) {
    const en = withStarMark(row.en, row.enHighlight);
    const ja = withStarMark(row.ja, row.jaHighlight);
    if (en.text === row.en && ja.text === row.ja) continue;

    changed++;
    console.log(`${row.id}\n  en: ${row.en} -> ${en.text} [${en.highlight ?? "-"}]\n  ja: ${row.ja} -> ${ja.text} [${ja.highlight ?? "-"}]`);

    if (apply) {
      await prisma.wordExample.update({
        where: { id: row.id },
        data: { en: en.text, ja: ja.text, enHighlight: en.highlight, jaHighlight: ja.highlight },
      });
    }
  }

  console.log(`${changed} example${changed === 1 ? "" : "s"} ${apply ? "updated" : "would change (dry run, pass --apply)"}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
