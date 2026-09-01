import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_MEDIUMS,
  DEFAULT_ACCOUNT_ROLES,
} from "../src/lib/constants";
import { serializeAllowedAccountTypes } from "../src/lib/mediums";

const prisma = new PrismaClient();

// Migrates a database that predates multi-user support: every account,
// transaction and EMI from the old single-user app has no owner yet. This
// creates the first (admin) user from the existing login credentials and
// assigns all of that orphaned data to them. Uses raw SQL for the backfill
// because it must also work in the brief window where `userId` is still
// nullable in the live database (see MIGRATING_TO_MULTI_USER.md) — before
// that column exists at all, or once it's NOT NULL, there's nothing left to
// backfill and this is a harmless no-op either way.
async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`Skipping seed — ${userCount} user(s) already exist.`);
    return;
  }

  const [{ count }] = await prisma.$queryRaw<{ count: number | bigint }[]>`
    SELECT COUNT(*) as count FROM accounts WHERE "userId" IS NULL
  `;
  if (Number(count) === 0) {
    console.log("No pre-existing single-user data to migrate — nothing to seed.");
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  const encodedHash = process.env.AUTH_PASSWORD_HASH_BASE64;
  if (!email || !encodedHash) {
    throw new Error(
      "Found existing data with no owner. Set ADMIN_EMAIL and AUTH_PASSWORD_HASH_BASE64 in .env " +
        "(see .env.example), then re-run `npm run db:seed`."
    );
  }

  const passwordHash = Buffer.from(encodedHash, "base64").toString("utf8");
  const admin = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      passwordHash,
      isAdmin: true,
      status: "APPROVED",
      categories: {
        create: [
          ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ name, type: "EXPENSE" as const })),
          ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ name, type: "INCOME" as const })),
        ],
      },
      mediums: {
        create: DEFAULT_MEDIUMS.map(({ name, allowedAccountTypes }) => ({
          name,
          allowedAccountTypes: serializeAllowedAccountTypes([...allowedAccountTypes]),
        })),
      },
      accountRoles: {
        create: DEFAULT_ACCOUNT_ROLES.map((name) => ({ name })),
      },
    },
  });

  const accounts = await prisma.$executeRaw`UPDATE accounts SET "userId" = ${admin.id} WHERE "userId" IS NULL`;
  const transactions = await prisma.$executeRaw`UPDATE transactions SET "userId" = ${admin.id} WHERE "userId" IS NULL`;
  const emis = await prisma.$executeRaw`UPDATE emis SET "userId" = ${admin.id} WHERE "userId" IS NULL`;

  console.log(
    `Created admin user ${admin.email} and assigned ${accounts} account(s), ${transactions} transaction(s), ` +
      `${emis} EMI(s) to them.`
  );
  console.log("Next: apply the follow-up migration that makes ownership required (see MIGRATING_TO_MULTI_USER.md).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
