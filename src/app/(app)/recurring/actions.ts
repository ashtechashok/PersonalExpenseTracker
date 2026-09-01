"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { currentPeriodKey, periodBounds, effectiveReferenceDate } from "@/lib/recurring";
import { nowInTimezone } from "@/lib/timezone";

// A recurring self-transfer moves money between your own accounts each
// period — it never counts toward "Recurring Due" on the Dashboard (see
// getPendingRecurringSummary in lib/recurring.ts), same as how a self-transfer
// transaction never counts as spending or income.
const SELF_TRANSFER_CATEGORY = "Self Transfer";

const templateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    type: z.enum(["EXPENSE", "INCOME", "SELF_TRANSFER"]),
    amount: z.number().positive("Amount must be greater than 0"),
    // Required for EXPENSE/INCOME; a self-transfer has no "spending
    // category" and always gets a fixed one server-side instead (see below).
    category: z.string().trim().max(100),
    medium: z.string().trim().max(20).nullable().optional(),
    accountId: z.string().trim().min(1, "Select an account"),
    // Optional second leg for an EXPENSE (e.g. an Emergency Fund/SSA
    // deposit); required destination account for a SELF_TRANSFER — see
    // RecurringTemplate.destinationAccountId.
    destinationAccountId: z.string().trim().min(1).nullable().optional(),
    frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
    dayOfMonth: z.number().int().min(1).max(31),
    // YEARLY-only: which calendar month (1-12) this is due in.
    dueMonth: z.number().int().min(1).max(12).nullable().optional(),
    // Optional bounded window — see RecurringTemplate.startDate/endDate.
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable().optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable().optional(),
    isActive: z.boolean(),
  })
  .refine((d) => d.type !== "EXPENSE" || !!d.medium, {
    message: "Select a medium for the expense",
    path: ["medium"],
  })
  .refine((d) => d.type === "SELF_TRANSFER" || d.category.trim().length > 0, {
    message: "Category is required",
    path: ["category"],
  })
  .refine((d) => d.type !== "SELF_TRANSFER" || !!d.destinationAccountId, {
    message: "Select a destination account to transfer to",
    path: ["destinationAccountId"],
  })
  .refine((d) => !d.destinationAccountId || d.destinationAccountId !== d.accountId, {
    message: "Source and destination accounts must be different",
    path: ["destinationAccountId"],
  })
  .refine((d) => d.frequency !== "YEARLY" || !!d.dueMonth, {
    message: "Select which month this is due in",
    path: ["dueMonth"],
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type RecurringTemplateInput = z.infer<typeof templateSchema>;
export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

async function assertOwnedAccount(userId: string, accountId: string) {
  const owned = await prisma.account.count({ where: { id: accountId, userId } });
  return owned > 0 ? null : "The selected account is invalid.";
}

export async function createTemplate(input: RecurringTemplateInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const accountError = await assertOwnedAccount(userId, d.accountId);
  if (accountError) return { error: accountError };
  const destinationAccountId = d.type !== "INCOME" ? d.destinationAccountId || null : null;
  if (destinationAccountId) {
    const destError = await assertOwnedAccount(userId, destinationAccountId);
    if (destError) return { error: destError };
  }

  await prisma.recurringTemplate.create({
    data: {
      userId,
      name: d.name,
      type: d.type,
      amount: d.amount,
      category: d.type === "SELF_TRANSFER" ? SELF_TRANSFER_CATEGORY : d.category,
      medium: d.type === "EXPENSE" ? d.medium : null,
      accountId: d.accountId,
      destinationAccountId,
      frequency: d.frequency,
      dayOfMonth: d.dayOfMonth,
      dueMonth: d.frequency === "YEARLY" ? d.dueMonth : null,
      startDate: d.startDate ? new Date(`${d.startDate}T00:00:00.000Z`) : null,
      endDate: d.endDate ? new Date(`${d.endDate}T00:00:00.000Z`) : null,
      isActive: d.isActive,
    },
  });

  revalidateAll();
  return {};
}

export async function updateTemplate(id: string, input: RecurringTemplateInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const accountError = await assertOwnedAccount(userId, d.accountId);
  if (accountError) return { error: accountError };
  const destinationAccountId = d.type !== "INCOME" ? d.destinationAccountId || null : null;
  if (destinationAccountId) {
    const destError = await assertOwnedAccount(userId, destinationAccountId);
    if (destError) return { error: destError };
  }

  const result = await prisma.recurringTemplate.updateMany({
    where: { id, userId },
    data: {
      name: d.name,
      type: d.type,
      amount: d.amount,
      category: d.type === "SELF_TRANSFER" ? SELF_TRANSFER_CATEGORY : d.category,
      medium: d.type === "EXPENSE" ? d.medium : null,
      accountId: d.accountId,
      destinationAccountId,
      frequency: d.frequency,
      dayOfMonth: d.dayOfMonth,
      dueMonth: d.frequency === "YEARLY" ? d.dueMonth : null,
      startDate: d.startDate ? new Date(`${d.startDate}T00:00:00.000Z`) : null,
      endDate: d.endDate ? new Date(`${d.endDate}T00:00:00.000Z`) : null,
      isActive: d.isActive,
    },
  });
  if (result.count === 0) return { error: "Template not found" };

  revalidateAll();
  return {};
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  // Cascades its skip records; any already-logged transactions are left
  // intact, just unlinked (recurringTemplateId -> null via onDelete: SetNull).
  const result = await prisma.recurringTemplate.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "Template not found" };
  revalidateAll();
  return {};
}

async function findTemplate(userId: string, id: string) {
  return prisma.recurringTemplate.findFirst({ where: { id, userId } });
}

async function currentPeriodTransaction(
  templateId: string,
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY",
  referenceDate?: Date
) {
  const { start, end } = periodBounds(currentPeriodKey(frequency, referenceDate));
  return prisma.transaction.findFirst({
    where: { recurringTemplateId: templateId, date: { gte: start, lte: end } },
  });
}

export async function markPaid(
  templateId: string,
  overrideAccountId?: string | null,
  overrideAmount?: number | null,
  overrideDate?: string | null
): Promise<ActionResult> {
  const { id: userId, timezone } = await requireSession();
  const template = await findTemplate(userId, templateId);
  if (!template) return { error: "Template not found" };

  // Defaults to "now" (or the template's own start date if that's still in
  // the future — paying a day early must still resolve the template's
  // *first* real period, not a period before it existed, since period
  // membership is just "does the transaction's date fall in that period's
  // calendar range"). An explicit override date takes precedence over both.
  let referenceDate = effectiveReferenceDate(template.startDate, nowInTimezone(timezone));
  if (overrideDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(overrideDate)) return { error: "Invalid date" };
    referenceDate = new Date(`${overrideDate}T00:00:00.000Z`);
  }

  const periodKey = currentPeriodKey(template.frequency, referenceDate);
  const existingSkip = await prisma.recurringSkip.findUnique({
    where: { templateId_periodKey: { templateId, periodKey } },
  });
  if (existingSkip) return { error: "This period was already cancelled — undo that first." };
  const existing = await currentPeriodTransaction(templateId, template.frequency, referenceDate);
  if (existing) return { error: "Already marked paid for this period." };

  const accountId = overrideAccountId || template.accountId;
  const accountError = await assertOwnedAccount(userId, accountId);
  if (accountError) return { error: accountError };
  if (overrideAmount != null && !(overrideAmount > 0)) return { error: "Enter a valid amount." };
  const amount = overrideAmount ?? Number(template.amount);

  await prisma.transaction.create({
    data: {
      userId,
      type: template.type,
      date: referenceDate,
      amount,
      purpose: template.name,
      category: template.category,
      medium: template.type === "EXPENSE" ? template.medium : null,
      sourceAccountId: template.type === "INCOME" ? null : accountId,
      creditAccountId: template.type === "INCOME" ? accountId : template.destinationAccountId,
      recurringTemplateId: templateId,
    },
  });

  revalidateAll();
  return {};
}

export async function cancelPeriod(templateId: string): Promise<ActionResult> {
  const { id: userId, timezone } = await requireSession();
  const template = await findTemplate(userId, templateId);
  if (!template) return { error: "Template not found" };

  const referenceDate = effectiveReferenceDate(template.startDate, nowInTimezone(timezone));
  const existing = await currentPeriodTransaction(templateId, template.frequency, referenceDate);
  if (existing) return { error: "Already marked paid for this period — delete that transaction first if you want to cancel it." };

  const periodKey = currentPeriodKey(template.frequency, referenceDate);
  await prisma.recurringSkip.upsert({
    where: { templateId_periodKey: { templateId, periodKey } },
    create: { templateId, periodKey },
    update: {},
  });

  revalidateAll();
  return {};
}

export async function undoCancelPeriod(templateId: string): Promise<ActionResult> {
  const { id: userId, timezone } = await requireSession();
  const template = await findTemplate(userId, templateId);
  if (!template) return { error: "Template not found" };

  const periodKey = currentPeriodKey(template.frequency, effectiveReferenceDate(template.startDate, nowInTimezone(timezone)));
  await prisma.recurringSkip.deleteMany({ where: { templateId, periodKey } });

  revalidateAll();
  return {};
}

export async function undoMarkPaid(templateId: string): Promise<ActionResult> {
  const { id: userId, timezone } = await requireSession();
  const template = await findTemplate(userId, templateId);
  if (!template) return { error: "Template not found" };

  const existing = await currentPeriodTransaction(
    templateId,
    template.frequency,
    effectiveReferenceDate(template.startDate, nowInTimezone(timezone))
  );
  if (!existing) return { error: "Not marked paid for this period" };

  // Deleting the transaction clears recurringTemplateId via onDelete: SetNull.
  await prisma.transaction.delete({ where: { id: existing.id } });

  revalidateAll();
  return {};
}
