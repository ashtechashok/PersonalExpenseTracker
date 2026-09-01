// One-time (but safe to re-run) backfill: gives every existing user the
// current default category list, so introducing per-user categories doesn't
// make anyone's picker suddenly empty. Upserts against the (userId, type,
// name) unique constraint (not createMany+skipDuplicates — SQLite doesn't
// support that), so re-running after a user has already added/renamed/
// deleted categories only fills in anything missing — it never overwrites
// or removes what they've customized.
import { PrismaClient } from "@prisma/client";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const entries = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ name, type: "EXPENSE" as const })),
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ name, type: "INCOME" as const })),
  ];

  for (const user of users) {
    for (const { name, type } of entries) {
      await prisma.category.upsert({
        where: { userId_type_name: { userId: user.id, type, name } },
        create: { userId: user.id, name, type },
        update: {},
      });
    }
    const total = await prisma.category.count({ where: { userId: user.id } });
    console.log(`${user.email}: has ${total} categor${total === 1 ? "y" : "ies"} total`);
  }

  console.log(`Done across ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
