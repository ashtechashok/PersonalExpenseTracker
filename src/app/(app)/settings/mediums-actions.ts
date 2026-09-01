"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { serializeAllowedAccountTypes } from "@/lib/mediums";

const mediumSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(20),
  allowedAccountTypes: z.array(z.enum(["BANK", "CREDIT", "PREPAID", "CASH", "WALLET"])),
  defaultAccountId: z.string().trim().min(1).nullable().optional(),
});

export type MediumInput = z.infer<typeof mediumSchema>;
export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
}

async function assertOwnedAccount(userId: string, accountId: string) {
  const owned = await prisma.account.count({ where: { id: accountId, userId } });
  return owned > 0 ? null : "The selected default account is invalid.";
}

export async function createMedium(input: MediumInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = mediumSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  if (d.defaultAccountId) {
    const err = await assertOwnedAccount(userId, d.defaultAccountId);
    if (err) return { error: err };
  }

  try {
    await prisma.medium.create({
      data: {
        userId,
        name: d.name,
        allowedAccountTypes: serializeAllowedAccountTypes(d.allowedAccountTypes),
        defaultAccountId: d.defaultAccountId || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That medium already exists." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}

export async function updateMedium(id: string, input: MediumInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = mediumSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  if (d.defaultAccountId) {
    const err = await assertOwnedAccount(userId, d.defaultAccountId);
    if (err) return { error: err };
  }

  try {
    const result = await prisma.medium.updateMany({
      where: { id, userId },
      data: {
        name: d.name,
        allowedAccountTypes: serializeAllowedAccountTypes(d.allowedAccountTypes),
        defaultAccountId: d.defaultAccountId || null,
      },
    });
    if (result.count === 0) return { error: "Medium not found" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That medium already exists." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}

export async function deleteMedium(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const result = await prisma.medium.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "Medium not found" };

  revalidateAll();
  return {};
}
