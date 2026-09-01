"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { CURRENCY_OPTIONS, LOCALE_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/constants";

const settingsSchema = z.object({
  currency: z.enum(CURRENCY_OPTIONS.map((c) => c.code) as [string, ...string[]]),
  locale: z.enum(LOCALE_OPTIONS.map((l) => l.code) as [string, ...string[]]),
  timezone: z.enum(TIMEZONE_OPTIONS.map((t) => t.tz) as [string, ...string[]]),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type ActionResult = { error?: string };

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const { id: userId } = await requireSession();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  // Every page reads currency/locale/timezone off the session, and formats
  // amounts/dates client-side from it — a full reload is the simplest way to
  // make every already-rendered page pick up the change.
  revalidatePath("/", "layout");
  return {};
}
