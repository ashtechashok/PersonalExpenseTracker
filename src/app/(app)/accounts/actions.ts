"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { computeBalances } from "@/lib/balances";

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["BANK", "CREDIT", "PREPAID", "CASH", "WALLET"]),
  // A free-text per-user label (see model AccountRole) — not restricted to
  // a fixed list here since a user's own roles can be freely renamed/added.
  role: z.string().trim().min(1, "Role is required").max(50),
  // What the user sees/edits is always the CURRENT balance (or outstanding),
  // not the raw opening balance stored in the DB — see updateAccount below.
  currentBalance: z.number(),
  creditLimit: z.number().positive().nullable().optional(),
  // Set when this card is an add-on/supplementary card sharing another
  // card's credit limit instead of having its own.
  addOnOfAccountId: z.string().trim().min(1).nullable().optional(),
  // Whether this account's balance counts towards the "Available Balance"
  // summary card — independent of role, so any bank/prepaid account (an
  // Emergency Fund, Investment, or SSA account included) can opt in or out.
  // Meaningless for CREDIT accounts (they're never counted here regardless).
  includeInAvailableBalance: z.boolean(),
});

// Only one level of add-on nesting is allowed, and only credit accounts can
// participate — shared by create/update since the rule never depends on
// which operation is in progress. Scoped to the owning user throughout so
// nobody can link their card onto (or be blocked by) another user's data.
async function validateAddOn(
  userId: string,
  id: string | null,
  addOnOfAccountId: string | null | undefined,
  type: string
) {
  if (!addOnOfAccountId) return null;
  if (type !== "CREDIT") return "Only credit cards can be add-on cards.";
  if (addOnOfAccountId === id) return "An account can't be its own parent card.";

  const parent = await prisma.account.findFirst({ where: { id: addOnOfAccountId, userId } });
  if (!parent) return "Selected parent card no longer exists.";
  if (parent.type !== "CREDIT") return "Parent card must be a credit card.";
  if (parent.addOnOfAccountId) return "Can't add on to a card that is itself an add-on card.";

  if (id) {
    const dependents = await prisma.account.count({ where: { addOnOfAccountId: id, userId } });
    if (dependents > 0) return "This card already has add-on cards linked to it and can't become one itself.";
  }

  return null;
}

export type AccountInput = z.infer<typeof accountSchema>;
export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function createAccount(input: AccountInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const addOnError = await validateAddOn(userId, null, d.addOnOfAccountId, d.type);
  if (addOnError) return { error: addOnError };

  // Brand new account, no transactions yet: current balance IS the opening balance.
  await prisma.account.create({
    data: {
      userId,
      name: d.name,
      type: d.type,
      role: d.role,
      openingBalance: d.currentBalance,
      // An add-on card shares its parent's limit, so it doesn't carry its own.
      creditLimit: d.type === "CREDIT" && !d.addOnOfAccountId ? d.creditLimit ?? null : null,
      addOnOfAccountId: d.type === "CREDIT" ? d.addOnOfAccountId ?? null : null,
      includeInAvailableBalance: d.includeInAvailableBalance,
    },
  });

  revalidateAll();
  return {};
}

export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const addOnError = await validateAddOn(userId, id, d.addOnOfAccountId, d.type);
  if (addOnError) return { error: addOnError };

  // Current balance = opening balance + net effect of every transaction that
  // touches this account. The user edits the current balance, so back out
  // what opening balance produces it: opening = desiredCurrent - netEffect.
  // (netEffect is computed by running the same formula with opening = 0.)
  const transactions = await prisma.transaction.findMany({
    where: { userId, OR: [{ sourceAccountId: id }, { creditAccountId: id }] },
    select: { type: true, amount: true, sourceAccountId: true, creditAccountId: true },
  });
  const netEffect =
    computeBalances(
      [{ id, type: d.type, openingBalance: 0 }],
      transactions.map((t) => ({ ...t, amount: Number(t.amount) }))
    ).get(id) ?? 0;

  const result = await prisma.account.updateMany({
    where: { id, userId },
    data: {
      name: d.name,
      type: d.type,
      role: d.role,
      openingBalance: d.currentBalance - netEffect,
      creditLimit: d.type === "CREDIT" && !d.addOnOfAccountId ? d.creditLimit ?? null : null,
      addOnOfAccountId: d.type === "CREDIT" ? d.addOnOfAccountId ?? null : null,
      includeInAvailableBalance: d.includeInAvailableBalance,
    },
  });
  if (result.count === 0) return { error: "Account not found" };

  revalidateAll();
  return {};
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  try {
    const result = await prisma.account.deleteMany({ where: { id, userId } });
    if (result.count === 0) return { error: "Account not found" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: "Can't delete this account — one or more transactions or recurring templates still reference it." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}
