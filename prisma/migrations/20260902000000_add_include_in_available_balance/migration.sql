-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "includeInAvailableBalance" BOOLEAN NOT NULL DEFAULT true;

-- Preserve today's behavior for existing rows: roles that were previously
-- hard-excluded from "Available Balance" start unchecked; everything else
-- (which already counted) keeps the column's default of true.
UPDATE "accounts" SET "includeInAvailableBalance" = false WHERE "role" IN ('EMERGENCY_FUND', 'INVESTMENT', 'SSA');
