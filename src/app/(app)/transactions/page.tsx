import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { parseAllowedAccountTypes } from "@/lib/mediums";
import TransactionsClient, { type ClientAccount, type ClientTransaction, type ClientMedium } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { id: userId } = await requireSession();
  const [accounts, transactions, categories, mediums] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.medium.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const clientAccounts: ClientAccount[] = accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }));
  const clientCategories = {
    expense: categories.filter((c) => c.type === "EXPENSE").map((c) => c.name),
    income: categories.filter((c) => c.type === "INCOME").map((c) => c.name),
  };
  const clientMediums: ClientMedium[] = mediums.map((m) => ({
    id: m.id,
    name: m.name,
    allowedAccountTypes: parseAllowedAccountTypes(m.allowedAccountTypes),
    defaultAccountId: m.defaultAccountId,
  }));

  const clientTransactions: ClientTransaction[] = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    date: t.date.toISOString().slice(0, 10),
    amount: Number(t.amount),
    purpose: t.purpose,
    category: t.category,
    medium: t.medium,
    sourceAccountId: t.sourceAccountId,
    creditAccountId: t.creditAccountId,
    destination: t.destination,
  }));

  return (
    <TransactionsClient
      accounts={clientAccounts}
      transactions={clientTransactions}
      categories={clientCategories}
      mediums={clientMediums}
    />
  );
}
