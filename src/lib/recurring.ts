import { prisma } from "@/lib/prisma";
import { nowInIst, nowInTimezone } from "@/lib/timezone";

export type RecurringFrequency = "MONTHLY" | "QUARTERLY" | "YEARLY";

/** The period a recurring template is tracked against for a given reference
 * date (defaults to now) — "2026-08" for MONTHLY, "2026-Q3" for QUARTERLY,
 * "2026" for YEARLY. Passing a specific date lets an occurrence be logged
 * against the period it's really for (e.g. dating it into next month)
 * instead of always whatever period "today" happens to fall in. */
export function currentPeriodKey(frequency: RecurringFrequency, referenceDate: Date = nowInIst()): string {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  if (frequency === "YEARLY") return `${year}`;
  if (frequency === "QUARTERLY") return `${year}-Q${Math.floor(month / 3) + 1}`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** Inclusive [start, end] bounds of a period key in any of the three formats,
 * for querying transactions by date. */
export function periodBounds(periodKey: string): { start: Date; end: Date } {
  if (periodKey.includes("-Q")) {
    const [yearStr, qStr] = periodKey.split("-Q");
    const year = Number(yearStr);
    const startMonth = (Number(qStr) - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    // One millisecond before the next quarter starts — see the MONTHLY case below for why.
    const end = new Date(Date.UTC(year, startMonth + 3, 1) - 1);
    return { start, end };
  }
  if (/^\d{4}$/.test(periodKey)) {
    const year = Number(periodKey);
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1) - 1);
    return { start, end };
  }
  const [year, month] = periodKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  // One millisecond before the next month starts — the last instant of the
  // last day, not midnight at its start, so a transaction logged later that
  // day (e.g. "now" when today is the last day of the month) still counts.
  const end = new Date(Date.UTC(year, month, 1) - 1);
  return { start, end };
}

/** The period immediately after the given one — lets a template already
 * resolved for its current period still be acted on early for the next one
 * (same idea as paying before a template's own start date, generalized to
 * every period after the first). */
export function nextPeriodKey(frequency: RecurringFrequency, periodKey: string): string {
  const { end } = periodBounds(periodKey);
  return currentPeriodKey(frequency, new Date(end.getTime() + 1));
}

/** The date to resolve a template's period against, absent an explicit
 * override: today, unless the template hasn't started yet, in which case its
 * own startDate — so acting on an upcoming item (even a day early) always
 * resolves its *first* real period, never a period before the template
 * existed. Without this, an occurrence dated into next month (because you
 * paid a day early) would never satisfy a period-membership check anchored
 * on today, since date-range matching requires the transaction's own date to
 * fall inside the period being checked. */
export function effectiveReferenceDate(startDate: Date | null, today: Date = nowInIst()): Date {
  if (!startDate) return today;
  const todayStr = today.toISOString().slice(0, 10);
  const startStr = startDate.toISOString().slice(0, 10);
  return todayStr < startStr ? startDate : today;
}

type DueTemplate = { frequency: RecurringFrequency; dayOfMonth: number; dueMonth: number | null };

/** Whether a still-unpaid template has reached its usual due point this
 * period — MONTHLY every month, QUARTERLY only in the quarter's last month
 * (Mar/Jun/Sep/Dec), YEARLY only in its dueMonth. Purely a display hint;
 * paying late or early never affects balances. */
export function isDueSoon(t: DueTemplate, today: Date = nowInIst()): boolean {
  const day = today.getUTCDate();
  const month = today.getUTCMonth() + 1;
  if (t.frequency === "MONTHLY") return day >= t.dayOfMonth;
  if (t.frequency === "YEARLY") return t.dueMonth != null && month === t.dueMonth && day >= t.dayOfMonth;
  return [3, 6, 9, 12].includes(month) && day >= t.dayOfMonth;
}

/** Count and total amount of active, in-range recurring templates that
 * haven't been paid or cancelled for their current period — used for the
 * Dashboard's "Recurring Due" summary card. Self-transfers are excluded:
 * moving money between your own accounts isn't an outstanding obligation,
 * same as how a self-transfer transaction never counts as spending. */
export async function getPendingRecurringSummary(
  userId: string,
  timezone: string = "Asia/Kolkata"
): Promise<{ count: number; total: number }> {
  const templates = await prisma.recurringTemplate.findMany({
    where: { userId, isActive: true, type: { not: "SELF_TRANSFER" } },
    select: {
      amount: true,
      frequency: true,
      startDate: true,
      endDate: true,
      transactions: { select: { date: true } },
      skips: { select: { periodKey: true } },
    },
  });

  const today = nowInTimezone(timezone);
  const todayStr = today.toISOString().slice(0, 10);
  let count = 0;
  let total = 0;

  for (const t of templates) {
    const startStr = t.startDate ? t.startDate.toISOString().slice(0, 10) : null;
    const endStr = t.endDate ? t.endDate.toISOString().slice(0, 10) : null;
    if (startStr && todayStr < startStr) continue;
    if (endStr && todayStr > endStr) continue;

    const periodKey = currentPeriodKey(t.frequency, today);
    const { start, end } = periodBounds(periodKey);
    const alreadyPaid = t.transactions.some((tx) => tx.date >= start && tx.date <= end);
    if (alreadyPaid) continue;
    const alreadySkipped = t.skips.some((s) => s.periodKey === periodKey);
    if (alreadySkipped) continue;

    count += 1;
    total += Number(t.amount);
  }

  return { count, total };
}
