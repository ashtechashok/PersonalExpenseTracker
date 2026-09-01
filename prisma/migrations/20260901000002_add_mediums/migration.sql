-- CreateTable
CREATE TABLE "mediums" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowedAccountTypes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "defaultAccountId" TEXT,

    CONSTRAINT "mediums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mediums_userId_idx" ON "mediums"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mediums_userId_name_key" ON "mediums"("userId", "name");

-- AddForeignKey
ALTER TABLE "mediums" ADD CONSTRAINT "mediums_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediums" ADD CONSTRAINT "mediums_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
