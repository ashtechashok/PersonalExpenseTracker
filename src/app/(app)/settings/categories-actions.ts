"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

// A category is only ever EXPENSE or INCOME — a self-transfer always gets a
// fixed category server-side instead (see SELF_TRANSFER_CATEGORY in
// transactions/actions.ts and recurring/actions.ts).
const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["EXPENSE", "INCOME"]),
});

const renameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
}

export async function createCategory(input: { name: string; type: "EXPENSE" | "INCOME" }): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.category.create({ data: { userId, name: parsed.data.name, type: parsed.data.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That category already exists." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = renameSchema.safeParse({ name });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await prisma.category.updateMany({ where: { id, userId }, data: { name: parsed.data.name } });
    if (result.count === 0) return { error: "Category not found" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That category already exists." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const result = await prisma.category.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "Category not found" };

  revalidateAll();
  return {};
}
