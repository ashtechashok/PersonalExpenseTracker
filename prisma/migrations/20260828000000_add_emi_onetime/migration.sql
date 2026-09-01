-- AlterTable
ALTER TABLE "emis" ADD COLUMN     "deductTransactionId" TEXT,
ADD COLUMN     "isOneTime" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "emis_deductTransactionId_key" ON "emis"("deductTransactionId");

-- AddForeignKey
ALTER TABLE "emis" ADD CONSTRAINT "emis_deductTransactionId_fkey" FOREIGN KEY ("deductTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

