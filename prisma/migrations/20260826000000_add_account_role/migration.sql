-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('GENERAL', 'SALARY', 'EXPENSE', 'EMERGENCY_FUND');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'GENERAL';

