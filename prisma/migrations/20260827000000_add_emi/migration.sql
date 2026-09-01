-- CreateTable
CREATE TABLE "emis" (
    "id" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "periodMonths" INTEGER NOT NULL,
    "person" TEXT NOT NULL,
    "isOwn" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emi_installments" (
    "id" TEXT NOT NULL,
    "emiId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receivedTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emi_installments_receivedTransactionId_key" ON "emi_installments"("receivedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "emi_installments_emiId_installmentNumber_key" ON "emi_installments"("emiId", "installmentNumber");

-- AddForeignKey
ALTER TABLE "emi_installments" ADD CONSTRAINT "emi_installments_emiId_fkey" FOREIGN KEY ("emiId") REFERENCES "emis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_installments" ADD CONSTRAINT "emi_installments_receivedTransactionId_fkey" FOREIGN KEY ("receivedTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

