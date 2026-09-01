"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { verifyPassword, hashPassword } from "@/lib/auth";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
  });

export type ActionResult = { error?: string };

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(d.currentPassword, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(d.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return {};
}
