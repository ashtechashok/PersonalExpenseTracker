-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "addOnOfAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_addOnOfAccountId_fkey" FOREIGN KEY ("addOnOfAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

