import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { decorateAccounts, summarizeAccounts, summarizeCurrentMonth } from "@/lib/balances";
import { getYetToReceiveTotal } from "@/lib/emi";
import { getPendingRecurringSummary } from "@/lib/recurring";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { id: userId, timezone, cardVisibility } = await requireSession();
  const [accounts, transactions, yetToReceive, recurringDue] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { userId },
      select: { type: true, amount: true, sourceAccountId: true, creditAccountId: true, date: true },
    }),
    getYetToReceiveTotal(userId),
    getPendingRecurringSummary(userId, timezone),
  ]);

  const decorated = decorateAccounts(accounts, transactions);
  const { availableBalance, creditOutstanding, roleTotals } = summarizeAccounts(decorated);
  const { monthSpent, monthIncome } = summarizeCurrentMonth(transactions, timezone);

  return (
    <DashboardClient
      summary={{
        monthSpent,
        monthIncome,
        availableBalance,
        creditOutstanding,
        roleTotals,
        yetToReceive,
        recurringDueCount: recurringDue.count,
        recurringDueTotal: recurringDue.total,
      }}
      initialCardVisibility={cardVisibility}
    />
  );
}
