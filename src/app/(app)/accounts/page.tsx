import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { decorateAccounts, applyCreditLimitPooling } from "@/lib/balances";
import AccountsClient, { type ClientAccount } from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { id: userId } = await requireSession();
  const [accounts, transactions, emis, accountRoles] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { userId },
      select: { type: true, amount: true, sourceAccountId: true, creditAccountId: true },
    }),
    prisma.emi.findMany({ where: { userId }, select: { cardAccountId: true, totalAmount: true } }),
    prisma.accountRole.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const decorated = applyCreditLimitPooling(
    decorateAccounts(accounts, transactions),
    emis.map((e) => ({ cardAccountId: e.cardAccountId, totalAmount: Number(e.totalAmount) }))
  );
  const creditLimitById = new Map(accounts.map((a) => [a.id, a.creditLimit != null ? Number(a.creditLimit) : null]));
  const nameById = new Map(accounts.map((a) => [a.id, a.name]));
  const hasAddOnCardsById = new Set(
    accounts.filter((a) => a.addOnOfAccountId).map((a) => a.addOnOfAccountId as string)
  );

  const clientAccounts: ClientAccount[] = decorated.map((a) => ({
    ...a,
    creditLimit: creditLimitById.get(a.id) ?? null,
    addOnOfAccountName: a.addOnOfAccountId ? nameById.get(a.addOnOfAccountId) ?? null : null,
    hasAddOnCards: hasAddOnCardsById.has(a.id),
  }));

  return <AccountsClient accounts={clientAccounts} accountRoles={accountRoles.map((r) => r.name)} />;
}
