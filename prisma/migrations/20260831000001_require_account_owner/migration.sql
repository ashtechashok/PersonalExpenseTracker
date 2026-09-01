-- Multi-user migration, step 2 of 2 — see MIGRATING_TO_MULTI_USER.md.
-- Run this only AFTER `npm run db:seed` has assigned every existing
-- account/transaction/emi row to a user — otherwise these ALTER COLUMNs
-- fail on the leftover NULLs (safely: nothing is changed, just re-run the
-- seed script and retry this migration).

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "emis" ALTER COLUMN "userId" SET NOT NULL;
