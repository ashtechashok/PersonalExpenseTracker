import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import EmiClient, { type ClientEmi, type ClientAccount } from "./EmiClient";

export const dynamic = "force-dynamic";

export default async function EmiPage() {
  const { id: userId } = await requireSession();
  const [emis, accounts] = await Promise.all([
    prisma.emi.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        installments: {
          orderBy: { installmentNumber: "asc" },
          include: {
            receivedTransaction: { select: { date: true, type: true, sourceAccountId: true, creditAccountId: true } },
          },
        },
        deductTransaction: { select: { date: true, sourceAccountId: true } },
      },
    }),
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, type: true } }),
  ]);

  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

  const clientEmis: ClientEmi[] = emis.map((e) => {
    const hasMoved = !!e.deductTransactionId || e.installments.some((i) => i.receivedTransactionId);
    return {
      id: e.id,
      totalAmount: Number(e.totalAmount),
      monthlyAmount: Number(e.monthlyAmount),
      periodMonths: e.periodMonths,
      person: e.person,
      isOwn: e.isOwn,
      isOneTime: e.isOneTime,
      startDate: e.startDate.toISOString().slice(0, 10),
      locked: hasMoved,
      cardAccountId: e.cardAccountId,
      cardAccountName: (e.cardAccountId && accountNameById.get(e.cardAccountId)) || null,
      deductedDate: e.deductTransaction?.date.toISOString().slice(0, 10) ?? null,
      deductedAccountName:
        (e.deductTransaction?.sourceAccountId && accountNameById.get(e.deductTransaction.sourceAccountId)) || null,
      installments: e.installments.map((i) => {
        const tx = i.receivedTransaction;
        const settledAccountId = tx ? (tx.type === "EXPENSE" ? tx.sourceAccountId : tx.creditAccountId) : null;
        return {
          id: i.id,
          installmentNumber: i.installmentNumber,
          dueDate: i.dueDate.toISOString().slice(0, 10),
          amount: Number(i.amount),
          receivedDate: tx?.date.toISOString().slice(0, 10) ?? null,
          receivedAccountName: (settledAccountId && accountNameById.get(settledAccountId)) || null,
        };
      }),
    };
  });

  const clientAccounts: ClientAccount[] = accounts;

  const yetToReceive = clientEmis
    .filter((e) => !e.isOwn)
    .flatMap((e) => e.installments)
    .filter((i) => !i.receivedDate)
    .reduce((s, i) => s + i.amount, 0);

  return <EmiClient emis={clientEmis} accounts={clientAccounts} yetToReceive={yetToReceive} />;
}
