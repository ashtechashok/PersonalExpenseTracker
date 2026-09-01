-- AlterTable
-- IMPORTANT: converts Account.role from the AccountRole enum to plain TEXT
-- IN PLACE, preserving every existing row's value (as its enum label text,
-- e.g. "EMERGENCY_FUND") — NOT a DROP COLUMN + ADD COLUMN, which would
-- silently wipe every account's role back to the default. A separate
-- follow-up script (prisma/backfill-account-roles.ts) remaps these raw
-- codes to their human labels and seeds each user's AccountRole list.
ALTER TABLE "accounts" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "accounts" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "accounts" ALTER COLUMN "role" SET DEFAULT 'General';

-- DropEnum
DROP TYPE "AccountRole";

-- CreateTable
CREATE TABLE "account_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "account_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_roles_userId_idx" ON "account_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_roles_userId_name_key" ON "account_roles"("userId", "name");

-- AddForeignKey
ALTER TABLE "account_roles" ADD CONSTRAINT "account_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
