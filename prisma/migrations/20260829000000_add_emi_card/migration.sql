-- AlterTable
ALTER TABLE "emis" ADD COLUMN     "cardAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "emis" ADD CONSTRAINT "emis_cardAccountId_fkey" FOREIGN KEY ("cardAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

