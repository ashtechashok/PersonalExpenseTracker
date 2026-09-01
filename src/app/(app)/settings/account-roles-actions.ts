"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
});

const renameSchema = createSchema;

export type ActionResult = { error?: string };

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function createAccountRole(input: { name: string }): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.accountRole.create({ data: { userId, name: parsed.data.name } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That role already exists." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}

export async function renameAccountRole(id: string, name: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = renameSchema.safeParse({ name });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await prisma.accountRole.updateMany({ where: { id, userId }, data: { name: parsed.data.name } });
    if (result.count === 0) return { error: "Role not found" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That role already exists." };
    }
    throw err;
  }

  revalidateAll();
  return {};
}

export async function deleteAccountRole(id: string): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const result = await prisma.accountRole.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "Role not found" };

  revalidateAll();
  return {};
}
