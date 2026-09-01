// One-time (but safe to re-run) backfill: gives every existing user the
// current default medium list, so introducing per-user mediums doesn't make
// anyone's picker suddenly empty. Also replicates the old hardcoded "Paytm
// defaults to whichever account is named 'Coral RuPay'" behavior — as a
// one-time lookup here, not a permanent runtime special case — so existing
// users see no change in behavior after the code that used to do this at
// runtime is removed.
import { PrismaClient } from "@prisma/client";
import { DEFAULT_MEDIUMS } from "../src/lib/constants";
import { serializeAllowedAccountTypes } from "../src/lib/mediums";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  for (const user of users) {
    // Plain JS substring match instead of a case-insensitive query filter —
    // Prisma's `mode: "insensitive"` is Postgres-only, and this script also
    // runs against local SQLite.
    const accounts = await prisma.account.findMany({ where: { userId: user.id }, select: { id: true, name: true } });
    const coral = accounts.find((a) => a.name.toLowerCase().includes("coral rupay"));

    for (const { name, allowedAccountTypes } of DEFAULT_MEDIUMS) {
      await prisma.medium.upsert({
        where: { userId_name: { userId: user.id, name } },
        create: {
          userId: user.id,
          name,
          allowedAccountTypes: serializeAllowedAccountTypes([...allowedAccountTypes]),
          defaultAccountId: name === "Paytm" ? (coral?.id ?? null) : null,
        },
        update: {},
      });
    }

    const total = await prisma.medium.count({ where: { userId: user.id } });
    console.log(`${user.email}: has ${total} medium${total === 1 ? "" : "s"} total`);
  }

  console.log(`Done across ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
