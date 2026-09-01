import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { currentPeriodKey, periodBounds, isDueSoon, effectiveReferenceDate, nextPeriodKey } from "@/lib/recurring";
import { nowInTimezone } from "@/lib/timezone";
import RecurringClient, { type ClientTemplate, type ClientAccount } from "./RecurringClient";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const { id: userId, timezone } = await requireSession();

  const [templates, accounts, categories, mediums] = await Promise.all([
    prisma.recurringTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        account: { select: { name: true } },
        destinationAccount: { select: { name: true } },
        // Not filtered by period here — each template's own frequency
        // determines its current period key, computed below.
        skips: { select: { periodKey: true } },
        transactions: {
          orderBy: { date: "desc" },
          take: 6,
          select: {
            date: true,
            sourceAccountId: true,
            creditAccountId: true,
            sourceAccount: { select: { name: true } },
            creditAccount: { select: { name: true } },
          },
        },
      },
    }),
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, type: true } }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.medium.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const clientCategories = {
    expense: categories.filter((c) => c.type === "EXPENSE").map((c) => c.name),
    income: categories.filter((c) => c.type === "INCOME").map((c) => c.name),
  };
  const clientMediums = mediums.map((m) => m.name);

  const today = nowInTimezone(timezone);
  const todayStr = today.toISOString().slice(0, 10);

  const clientTemplates: ClientTemplate[] = templates.map((t) => {
    const periodKey = currentPeriodKey(t.frequency, effectiveReferenceDate(t.startDate, today));
    const { start, end } = periodBounds(periodKey);
    const currentTx = t.transactions.find((tx) => tx.date >= start && tx.date <= end);
    const currentSkip = t.skips.some((s) => s.periodKey === periodKey);

    const startDateStr = t.startDate ? t.startDate.toISOString().slice(0, 10) : null;
    const endDateStr = t.endDate ? t.endDate.toISOString().slice(0, 10) : null;
    const rangeStatus: "UPCOMING" | "IN_RANGE" | "ENDED" =
      startDateStr && todayStr < startDateStr ? "UPCOMING" : endDateStr && todayStr > endDateStr ? "ENDED" : "IN_RANGE";
    // Income only ever has a "credit to" account; expense/self-transfer both
    // debit a source and (optionally, for expense; always, for self-transfer)
    // credit a destination.
    const hasSource = t.type !== "INCOME";
    const currentPaidAccountName = currentTx
      ? hasSource
        ? (currentTx.sourceAccount?.name ?? null)
        : (currentTx.creditAccount?.name ?? null)
      : null;
    const currentPaidDestinationName = currentTx && hasSource ? (currentTx.creditAccount?.name ?? null) : null;

    // Once this period is resolved (paid or cancelled), offer to act on the
    // *next* one early too — same idea as paying before the template's own
    // start date, just generalized past the first period. Only offered when
    // the next period isn't already resolved itself, and still falls within
    // the template's active window (if it has an end date).
    let nextPeriodStartDate: string | null = null;
    if (currentTx || currentSkip) {
      const nKey = nextPeriodKey(t.frequency, periodKey);
      const { start: nStart, end: nEnd } = periodBounds(nKey);
      const nextResolved = t.transactions.some((tx) => tx.date >= nStart && tx.date <= nEnd) || t.skips.some((s) => s.periodKey === nKey);
      const nStartStr = nStart.toISOString().slice(0, 10);
      if (!nextResolved && (!endDateStr || nStartStr <= endDateStr)) {
        nextPeriodStartDate = nStartStr;
      }
    }

    return {
      id: t.id,
      name: t.name,
      type: t.type as "EXPENSE" | "INCOME" | "SELF_TRANSFER",
      amount: Number(t.amount),
      category: t.category,
      medium: t.medium,
      accountId: t.accountId,
      accountName: t.account.name,
      destinationAccountId: t.destinationAccountId,
      destinationAccountName: t.destinationAccount?.name ?? null,
      frequency: t.frequency,
      dayOfMonth: t.dayOfMonth,
      dueMonth: t.dueMonth,
      startDate: startDateStr,
      endDate: endDateStr,
      rangeStatus,
      isActive: t.isActive,
      isDueSoon: !currentTx && !currentSkip && isDueSoon(t, today),
      nextPeriodStartDate,
      currentPeriod: {
        status: currentTx ? "PAID" : currentSkip ? "SKIPPED" : "PENDING",
        paidDate: currentTx?.date.toISOString().slice(0, 10) ?? null,
        paidAccountName: currentPaidAccountName,
        paidDestinationName: currentPaidDestinationName,
      },
      history: t.transactions.map((tx) => ({
        date: tx.date.toISOString().slice(0, 10),
        accountName: (hasSource ? tx.sourceAccount?.name : tx.creditAccount?.name) ?? null,
        destinationName: hasSource ? (tx.creditAccount?.name ?? null) : null,
      })),
    };
  });

  const clientAccounts: ClientAccount[] = accounts;

  return (
    <RecurringClient
      templates={clientTemplates}
      accounts={clientAccounts}
      categories={clientCategories}
      mediums={clientMediums}
    />
  );
}
