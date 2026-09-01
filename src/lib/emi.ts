import { prisma } from "@/lib/prisma";

/** One due date per month, starting at startDate, for `periodMonths` installments. */
export function generateInstallmentDueDates(startDate: Date, periodMonths: number): Date[] {
  const dates: Date[] = [];
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const day = startDate.getUTCDate();
  for (let i = 0; i < periodMonths; i++) {
    dates.push(new Date(Date.UTC(year, month + i, day)));
  }
  return dates;
}

/** Total still owed to you by other people across all non-own EMIs. */
export async function getYetToReceiveTotal(userId: string): Promise<number> {
  const result = await prisma.emiInstallment.aggregate({
    where: { receivedTransactionId: null, emi: { isOwn: false, userId } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}
