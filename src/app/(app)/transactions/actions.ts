"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const transactionSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME", "SELF_TRANSFER"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    amount: z.number().positive("Amount must be greater than 0"),
    purpose: z.string().trim().min(1, "Purpose is required").max(200),
    // Required for EXPENSE/INCOME; a self-transfer has no "spending
    // category" and always gets a fixed one server-side instead (see below).
    category: z.string().trim().max(100),
    medium: z.string().trim().max(20).nullable().optional(),
    sourceAccountId: z.string().trim().min(1).nullable().optional(),
    creditAccountId: z.string().trim().min(1).nullable().optional(),
    destination: z.string().trim().max(200).nullable().optional(),
  })
  .refine((data) => data.type !== "INCOME" || !!data.creditAccountId, {
    message: "Select an account to credit for income",
    path: ["creditAccountId"],
  })
  .refine((data) => data.type !== "EXPENSE" || !!data.medium, {
    message: "Select a medium for the expense",
    path: ["medium"],
  })
  .refine((data) => data.type === "SELF_TRANSFER" || data.category.trim().length > 0, {
    message: "Category is required",
    path: ["category"],
  })
  .refine((data) => data.type !== "SELF_TRANSFER" || !!data.sourceAccountId, {
    message: "Select a source account to transfer from",
    path: ["sourceAccountId"],
  })
  .refine((data) => data.type !== "SELF_TRANSFER" || !!data.creditAccountId, {
    message: "Select a destination account to transfer to",
    path: ["creditAccountId"],
  })
  .refine((data) => data.type !== "SELF_TRANSFER" || data.sourceAccountId !== data.creditAccountId, {
    message: "Source and destination accounts must be different",
    path: ["creditAccountId"],
  });

// A self-transfer moves money between your own accounts — there's no
// meaningful "spending category" for that, so it always gets this fixed one
// regardless of what the client sends.
const SELF_TRANSFER_CATEGORY = "Self Transfer";

export type TransactionInput = z.infer<typeof transactionSchema>;
export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

// The chosen source/credit account ids must actually belong to this user —
// otherwise one user could smuggle a reference to another user's account
// into their own transaction.
async function assertOwnedAccounts(userId: string, ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (wanted.length === 0) return null;
  const owned = await prisma.account.count({ where: { id: { in: wanted }, userId } });
  return owned === wanted.length ? null : "One of the selected accounts is invalid.";
}

export async function createTransaction(input: TransactionInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const ownError = await assertOwnedAccounts(userId, [d.sourceAccountId, d.creditAccountId]);
  if (ownError) return { error: ownError };

  await prisma.transaction.create({
    data: {
      userId,
      type: d.type,
      date: new Date(`${d.date}T00:00:00.000Z`),
      amount: d.amount,
      purpose: d.purpose,
      category: d.type === "SELF_TRANSFER" ? SELF_TRANSFER_CATEGORY : d.category,
      medium: d.type === "EXPENSE" ? d.medium : null,
      sourceAccountId: d.type === "EXPENSE" || d.type === "SELF_TRANSFER" ? d.sourceAccountId || null : null,
      creditAccountId: d.creditAccountId || null,
      destination: d.destination || null,
    },
  });

  revalidateAll();
  return {};
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const ownError = await assertOwnedAccounts(userId, [d.sourceAccountId, d.creditAccountId]);
  if (ownError) return { error: ownError };

  const result = await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      type: d.type,
      date: new Date(`${d.date}T00:00:00.000Z`),
      amount: d.amount,
      purpose: d.purpose,
      category: d.type === "SELF_TRANSFER" ? SELF_TRANSFER_CATEGORY : d.category,
      medium: d.type === "EXPENSE" ? d.medium : null,
      sourceAccountId: d.type === "EXPENSE" || d.type === "SELF_TRANSFER" ? d.sourceAccountId || null : null,
      creditAccountId: d.creditAccountId || null,
      destination: d.destination || null,
    },
  });
  if (result.count === 0) return { error: "Transaction not found" };

  revalidateAll();
  return {};
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const result = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "Transaction not found" };
  revalidateAll();
  return {};
}
