"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const visibilitySchema = z.record(z.string(), z.boolean());

export type ActionResult = { error?: string };

// Persisted server-side (not localStorage) so hiding a card sticks across
// devices/browsers and survives logging out and back in elsewhere. Only
// entries for hidden cards need to be stored — see the User.cardVisibility
// comment in schema.prisma.
export async function updateCardVisibility(visibility: Record<string, boolean>): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = visibilitySchema.safeParse(visibility);
  if (!parsed.success) return { error: "Invalid input" };

  await prisma.user.update({
    where: { id: userId },
    data: { cardVisibility: JSON.stringify(parsed.data) },
  });

  return {};
}
