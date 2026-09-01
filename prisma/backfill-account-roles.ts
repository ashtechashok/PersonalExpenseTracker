// One-time (but safe to re-run) migration step for converting Account.role
// from the old AccountRole enum to a free-text, per-user label:
//
// 1. Remaps every account's role from its old raw enum code (e.g.
//    "EMERGENCY_FUND") to the human label that was already shown on-screen
//    for it (e.g. "Emergency Fund") — so existing accounts look identical
//    after the migration, even though the column is no longer an enum.
//    Only touches values that exactly match a known old code, so it's a
//    no-op (and safe to re-run) once already applied.
// 2. Seeds every user's AccountRole list with the same default names, like
//    the Category/Medium backfills — so nothing disappears from the picker.
import { PrismaClient } from "@prisma/client";
import { DEFAULT_ACCOUNT_ROLES } from "../src/lib/constants";

const prisma = new PrismaClient();

// Old enum code -> the label it was already displayed as (ACCOUNT_ROLE_LABELS,
// now removed from src/lib/constants.ts since role is no longer an enum).
const OLD_CODE_TO_LABEL: Record<string, string> = {
  GENERAL: "General",
  SALARY: "Salary Account",
  EXPENSE: "Expense Account",
  EMERGENCY_FUND: "Emergency Fund",
  INVESTMENT: "Investment",
  SSA: "SSA",
};

async function main() {
  const accounts = await prisma.account.findMany({ select: { id: true, role: true } });
  let remapped = 0;
  for (const a of accounts) {
    const label = OLD_CODE_TO_LABEL[a.role];
    if (!label || label === a.role) continue;
    await prisma.account.update({ where: { id: a.id }, data: { role: label } });
    remapped++;
  }
  console.log(`Remapped ${remapped} account(s) from old role codes to labels.`);

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const user of users) {
    for (const name of DEFAULT_ACCOUNT_ROLES) {
      await prisma.accountRole.upsert({
        where: { userId_name: { userId: user.id, name } },
        create: { userId: user.id, name },
        update: {},
      });
    }
    const total = await prisma.accountRole.count({ where: { userId: user.id } });
    console.log(`${user.email}: has ${total} account role${total === 1 ? "" : "s"} total`);
  }

  console.log(`Done across ${users.length} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
