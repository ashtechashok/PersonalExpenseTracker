-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "recurring_templates" ADD COLUMN     "dueMonth" INTEGER,
ADD COLUMN     "frequency" "RecurringFrequency" NOT NULL DEFAULT 'MONTHLY';

