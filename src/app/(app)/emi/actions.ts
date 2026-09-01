"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { generateInstallmentDueDates } from "@/lib/emi";
import { nowInTimezone } from "@/lib/timezone";

const emiSchema = z
  .object({
    totalAmount: z.number().positive("Total amount must be greater than 0"),
    monthlyAmount: z.number().positive("Monthly EMI must be greater than 0"),
    periodMonths: z.number().int().min(1, "Period must be at least 1 month").max(600),
    person: z.string().trim().min(1, "Person is required").max(100),
    isOwn: z.boolean(),
    isOneTime: z.boolean(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    deductAccountId: z.string().trim().min(1).nullable().optional(),
    cardAccountId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((d) => !d.isOneTime || !!d.deductAccountId, {
    message: "Select an account to deduct from for a one-time loan",
    path: ["deductAccountId"],
  });

export type EmiInput = z.infer<typeof emiSchema>;
export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/emi");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

// A one-time loan is just an EMI with a single installment, deducted via
// deductAccountId — force the shape server-side and clear the (regular-EMI-only)
// card hold regardless of what the client sent.
function normalize(d: EmiInput) {
  return d.isOneTime ? { ...d, monthlyAmount: d.totalAmount, periodMonths: 1, cardAccountId: null } : d;
}

async function assertCreditAccount(userId: string, accountId: string | null | undefined) {
  if (!accountId) return null;
  const account = await prisma.account.findFirst({ where: { id: accountId, userId }, select: { type: true } });
  if (!account || account.type !== "CREDIT") return "The selected card must be a credit card account";
  return null;
}

async function assertOwnedAccount(userId: string, accountId: string | null | undefined) {
  if (!accountId) return null;
  const owned = await prisma.account.count({ where: { id: accountId, userId } });
  return owned > 0 ? null : "The selected account is invalid.";
}

export async function createEmi(input: EmiInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = emiSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = normalize(parsed.data);

  const cardError = await assertCreditAccount(userId, d.cardAccountId);
  if (cardError) return { error: cardError };
  const deductError = await assertOwnedAccount(userId, d.deductAccountId);
  if (deductError) return { error: deductError };

  const startDate = new Date(`${d.startDate}T00:00:00.000Z`);
  const dueDates = generateInstallmentDueDates(startDate, d.periodMonths);

  await prisma.$transaction(async (tx) => {
    let deductTransactionId: string | undefined;
    if (d.isOneTime) {
      const deduction = await tx.transaction.create({
        data: {
          userId,
          type: "EXPENSE",
          date: startDate,
          amount: d.totalAmount,
          purpose: `Loan to ${d.person}`,
          category: "EMI / Loan",
          sourceAccountId: d.deductAccountId,
        },
      });
      deductTransactionId = deduction.id;
    }

    await tx.emi.create({
      data: {
        userId,
        totalAmount: d.totalAmount,
        monthlyAmount: d.monthlyAmount,
        periodMonths: d.periodMonths,
        person: d.person,
        isOwn: d.isOwn,
        isOneTime: d.isOneTime,
        startDate,
        deductTransactionId,
        cardAccountId: d.cardAccountId,
        installments: {
          create: dueDates.map((dueDate, i) => ({
            installmentNumber: i + 1,
            dueDate,
            amount: d.monthlyAmount,
          })),
        },
      },
    });
  });

  revalidateAll();
  return {};
}

export async function updateEmi(id: string, input: EmiInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = emiSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = normalize(parsed.data);

  const existing = await prisma.emi.findFirst({ where: { id, userId }, include: { installments: true } });
  if (!existing) return { error: "EMI not found" };

  const hasMoved = !!existing.deductTransactionId || existing.installments.some((i) => i.receivedTransactionId);

  if (hasMoved) {
    // Money has already moved against this EMI — only descriptive fields stay editable.
    await prisma.emi.update({ where: { id }, data: { person: d.person, isOwn: d.isOwn } });
    revalidateAll();
    return {};
  }

  const cardError = await assertCreditAccount(userId, d.cardAccountId);
  if (cardError) return { error: cardError };
  const deductError = await assertOwnedAccount(userId, d.deductAccountId);
  if (deductError) return { error: deductError };

  const startDate = new Date(`${d.startDate}T00:00:00.000Z`);
  const dueDates = generateInstallmentDueDates(startDate, d.periodMonths);

  await prisma.$transaction(async (tx) => {
    let deductTransactionId = existing.deductTransactionId ?? undefined;
    if (d.isOneTime && !deductTransactionId) {
      const deduction = await tx.transaction.create({
        data: {
          userId,
          type: "EXPENSE",
          date: startDate,
          amount: d.totalAmount,
          purpose: `Loan to ${d.person}`,
          category: "EMI / Loan",
          sourceAccountId: d.deductAccountId,
        },
      });
      deductTransactionId = deduction.id;
    }

    // Safe to fully regenerate: hasMoved is false, so no installment has been received.
    await tx.emiInstallment.deleteMany({ where: { emiId: id } });
    await tx.emi.update({
      where: { id },
      data: {
        totalAmount: d.totalAmount,
        monthlyAmount: d.monthlyAmount,
        periodMonths: d.periodMonths,
        person: d.person,
        isOwn: d.isOwn,
        isOneTime: d.isOneTime,
        startDate,
        deductTransactionId,
        cardAccountId: d.cardAccountId,
        installments: {
          create: dueDates.map((dueDate, i) => ({
            installmentNumber: i + 1,
            dueDate,
            amount: d.monthlyAmount,
          })),
        },
      },
    });
  });

  revalidateAll();
  return {};
}

export async function deleteEmi(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  // Cascades installments; any already-recorded deduction/repayment transactions are left intact.
  const result = await prisma.emi.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "EMI not found" };
  revalidateAll();
  return {};
}

export async function markInstallmentReceived(installmentId: string, creditAccountId: string): Promise<ActionResult> {
  const { id: userId, timezone } = await requireSession();
  if (!creditAccountId) return { error: "Select an account to receive into" };

  const installment = await prisma.emiInstallment.findFirst({
    where: { id: installmentId, emi: { userId } },
    include: { emi: true },
  });
  if (!installment) return { error: "Installment not found" };
  if (installment.emi.isOwn) return { error: "This EMI is marked as your own — nothing to receive" };
  if (installment.receivedTransactionId) return { error: "Already marked received" };

  const ownError = await assertOwnedAccount(userId, creditAccountId);
  if (ownError) return { error: ownError };

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: "INCOME",
        date: nowInTimezone(timezone),
        amount: installment.amount,
        purpose: installment.emi.isOneTime
          ? `Loan repayment — ${installment.emi.person}`
          : `EMI repayment — ${installment.emi.person} (Installment ${installment.installmentNumber}/${installment.emi.periodMonths})`,
        category: "EMI Repayment",
        creditAccountId,
      },
    });
    await tx.emiInstallment.update({
      where: { id: installmentId },
      data: { receivedTransactionId: transaction.id },
    });
  });

  revalidateAll();
  return {};
}

export async function markInstallmentPaid(installmentId: string, sourceAccountId: string): Promise<ActionResult> {
  const { id: userId, timezone } = await requireSession();
  if (!sourceAccountId) return { error: "Select an account to pay from" };

  const account = await prisma.account.findFirst({ where: { id: sourceAccountId, userId }, select: { type: true } });
  if (!account) return { error: "Account not found" };
  if (account.type === "CREDIT") return { error: "Pay from a bank, prepaid, cash, or wallet account, not another credit card" };

  const installment = await prisma.emiInstallment.findFirst({
    where: { id: installmentId, emi: { userId } },
    include: { emi: true },
  });
  if (!installment) return { error: "Installment not found" };
  if (!installment.emi.isOwn) return { error: "This EMI isn't marked as your own" };
  if (installment.receivedTransactionId) return { error: "Already marked paid" };

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: "EXPENSE",
        date: nowInTimezone(timezone),
        amount: installment.amount,
        purpose: `EMI payment — ${installment.emi.person} (Installment ${installment.installmentNumber}/${installment.emi.periodMonths})`,
        category: "EMI / Loan",
        sourceAccountId,
      },
    });
    await tx.emiInstallment.update({
      where: { id: installmentId },
      data: { receivedTransactionId: transaction.id },
    });
  });

  revalidateAll();
  return {};
}

export async function undoInstallmentReceipt(installmentId: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const installment = await prisma.emiInstallment.findFirst({ where: { id: installmentId, emi: { userId } } });
  if (!installment?.receivedTransactionId) return { error: "Not marked received" };

  // Deleting the transaction clears receivedTransactionId via onDelete: SetNull.
  await prisma.transaction.delete({ where: { id: installment.receivedTransactionId } });

  revalidateAll();
  return {};
}
