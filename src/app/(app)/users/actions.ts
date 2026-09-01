"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type ActionResult = { error?: string };

export async function approveUser(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { status: "APPROVED" } });
  revalidatePath("/users");
  return {};
}

export async function rejectUser(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (id === admin.id) return { error: "You can't reject your own account." };
  await prisma.user.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/users");
  return {};
}

export async function setUserAdmin(id: string, isAdmin: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (id === admin.id && !isAdmin) return { error: "You can't remove your own admin access." };

  if (!isAdmin) {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount <= 1) return { error: "There must be at least one admin." };
  }

  await prisma.user.update({ where: { id }, data: { isAdmin } });
  revalidatePath("/users");
  return {};
}
