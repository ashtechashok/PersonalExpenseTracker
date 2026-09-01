import type { Account, AccountType, Transaction } from "@prisma/client";
import { nowInTimezone } from "@/lib/timezone";

export type DecoratedAccount = {
  id: string;
  name: string;
  type: AccountType;
  role: string;
  balance: number;
  available: number | null;
  addOnOfAccountId: string | null;
  // The credit limit actually in effect for this account — its own, or (for
  // an add-on card) the parent's shared limit. Same value for every account
  // in a pooled group.
  resolvedCreditLimit: number | null;
  // Whether this account's balance counts towards "Available Balance" — a
  // per-account toggle, independent of role/type (except CREDIT, which never
  // counts here regardless of this flag).
  includeInAvailableBalance: boolean;
};

type BalanceAccount = { id: string; type: string; openingBalance: number };
type BalanceTransaction = {
  type: string;
  amount: number;
  sourceAccountId: string | null;
  creditAccountId: string | null;
};

/**
 * Current balance is never stored/mutated directly — it's always opening
 * balance plus the net effect of every transaction that references the
 * account. That keeps balances correct after any edit/delete without a
 * reverse-then-reapply dance, and immune to drift from partial writes.
 */
export function computeBalances(accounts: BalanceAccount[], transactions: BalanceTransaction[]): Map<string, number> {
  const balances = new Map<string, number>();
  const typeById = new Map(accounts.map((a) => [a.id, a.type]));

  for (const a of accounts) balances.set(a.id, a.openingBalance);

  for (const tx of transactions) {
    // A self-transfer debits its source exactly like an expense does — the
    // only difference is it doesn't count as spending (see summarizeTransactions).
    if ((tx.type === "EXPENSE" || tx.type === "SELF_TRANSFER") && tx.sourceAccountId) {
      const type = typeById.get(tx.sourceAccountId);
      if (type !== undefined) {
        const current = balances.get(tx.sourceAccountId) ?? 0;
        // Credit cards don't hold money: a debit increases what's owed.
        balances.set(tx.sourceAccountId, type === "CREDIT" ? current + tx.amount : current - tx.amount);
      }
    }

    if (tx.creditAccountId) {
      const type = typeById.get(tx.creditAccountId);
      if (type !== undefined) {
        const current = balances.get(tx.creditAccountId) ?? 0;
        // A credit pays down a card's outstanding, or tops up a real balance.
        balances.set(tx.creditAccountId, type === "CREDIT" ? current - tx.amount : current + tx.amount);
      }
    }
  }

  return balances;
}

export function decorateAccounts(
  accounts: Account[],
  transactions: Pick<Transaction, "type" | "amount" | "sourceAccountId" | "creditAccountId">[]
): DecoratedAccount[] {
  const balanceAccounts: BalanceAccount[] = accounts.map((a) => ({
    id: a.id,
    type: a.type,
    openingBalance: Number(a.openingBalance),
  }));
  const balanceTransactions: BalanceTransaction[] = transactions.map((t) => ({
    type: t.type,
    amount: Number(t.amount),
    sourceAccountId: t.sourceAccountId,
    creditAccountId: t.creditAccountId,
  }));

  const balances = computeBalances(balanceAccounts, balanceTransactions);

  return accounts.map((a) => {
    const balance = balances.get(a.id) ?? Number(a.openingBalance);
    const creditLimit = a.creditLimit != null ? Number(a.creditLimit) : null;
    const available = a.type === "CREDIT" ? (creditLimit != null ? creditLimit - balance : null) : balance;
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      role: a.role,
      balance,
      available,
      addOnOfAccountId: a.addOnOfAccountId,
      resolvedCreditLimit: creditLimit,
      includeInAvailableBalance: a.includeInAvailableBalance,
    };
  });
}

/**
 * Add-on/supplementary cards share their parent's credit limit instead of
 * having their own (one level deep only), and an EMI put on either card in a
 * group blocks the whole remaining principal against the *shared* limit
 * immediately — not just what's been billed so far. This folds both effects
 * into a single pass per credit account: outstanding and EMI holds are
 * pooled across the group, then `available`/`resolvedCreditLimit` are
 * recomputed from the group's shared limit. A standalone card is just a
 * group of one, so this fully replaces the old EMI-only hold logic.
 */
export function applyCreditLimitPooling(
  decorated: DecoratedAccount[],
  emis: { cardAccountId: string | null; totalAmount: number }[]
): DecoratedAccount[] {
  const rootOf = (a: DecoratedAccount) => a.addOnOfAccountId ?? a.id;

  const groupOutstanding = new Map<string, number>();
  const groupLimit = new Map<string, number | null>();

  for (const a of decorated) {
    if (a.type !== "CREDIT") continue;
    const root = rootOf(a);
    groupOutstanding.set(root, (groupOutstanding.get(root) ?? 0) + a.balance);
    // The limit lives on the root account only — an add-on's own
    // resolvedCreditLimit is forced null at the data layer, so whichever
    // member actually carries a limit is the root.
    if (a.id === root) groupLimit.set(root, a.resolvedCreditLimit);
  }

  const groupEmiHold = new Map<string, number>();
  for (const e of emis) {
    if (!e.cardAccountId) continue;
    const card = decorated.find((a) => a.id === e.cardAccountId);
    const root = card ? rootOf(card) : e.cardAccountId;
    groupEmiHold.set(root, (groupEmiHold.get(root) ?? 0) + e.totalAmount);
  }

  return decorated.map((a) => {
    if (a.type !== "CREDIT") return a;
    const root = rootOf(a);
    const limit = groupLimit.get(root) ?? null;
    const outstanding = groupOutstanding.get(root) ?? a.balance;
    const held = groupEmiHold.get(root) ?? 0;
    const available = limit != null ? limit - outstanding - held : null;
    return { ...a, available, resolvedCreditLimit: limit };
  });
}

export function summarizeAccounts(decorated: DecoratedAccount[]) {
  // Whether a non-credit account counts towards "Available Balance" is a
  // per-account toggle (see Account.includeInAvailableBalance) rather than
  // being derived from its role — any role's account can opt in, and an
  // ordinary account can opt out, same as any other.
  const availableBalance = decorated
    .filter((a) => a.type !== "CREDIT" && a.includeInAvailableBalance)
    .reduce((s, a) => s + a.balance, 0);
  const creditOutstanding = decorated
    .filter((a) => a.type === "CREDIT")
    .reduce((s, a) => s + a.balance, 0);

  // Every distinct role value in use gets its own Dashboard total — not
  // just one hardcoded "Emergency Fund" role — computed regardless of
  // includeInAvailableBalance, same as the old Emergency Fund total was.
  const roleTotalsByName = new Map<string, number>();
  for (const a of decorated) {
    roleTotalsByName.set(a.role, (roleTotalsByName.get(a.role) ?? 0) + a.balance);
  }
  const roleTotals = Array.from(roleTotalsByName, ([role, total]) => ({ role, total }));

  return { availableBalance, creditOutstanding, roleTotals };
}

/** Spend/income for the current calendar month only — always "now", so it
 * naturally rolls over on the 1st with no reset logic of its own. */
export function summarizeCurrentMonth(
  transactions: Pick<Transaction, "type" | "amount" | "date">[],
  timezone: string = "Asia/Kolkata"
) {
  const now = nowInTimezone(timezone);
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  let monthSpent = 0;
  let monthIncome = 0;
  for (const tx of transactions) {
    if (tx.date.toISOString().slice(0, 7) !== currentMonthKey) continue;
    const amount = Number(tx.amount);
    if (tx.type === "EXPENSE") monthSpent += amount;
    else if (tx.type === "INCOME") monthIncome += amount;
    // SELF_TRANSFER doesn't count as spending or income.
  }

  return { monthSpent, monthIncome };
}
