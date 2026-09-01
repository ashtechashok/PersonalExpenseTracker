import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { parseAllowedAccountTypes } from "@/lib/mediums";
import SettingsClient from "./SettingsClient";
import type { ClientCategory } from "./CategoriesSection";
import type { ClientMedium, ClientAccount } from "./MediumsSection";
import type { ClientAccountRole } from "./AccountRolesSection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { id: userId, currency, locale, timezone } = await requireSession();

  const [categories, mediums, accounts, accountRoles] = await Promise.all([
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.medium.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { defaultAccount: { select: { name: true } } },
    }),
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, type: true } }),
    prisma.accountRole.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  const clientCategories: ClientCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "EXPENSE" | "INCOME",
  }));

  const clientMediums: ClientMedium[] = mediums.map((m) => ({
    id: m.id,
    name: m.name,
    allowedAccountTypes: parseAllowedAccountTypes(m.allowedAccountTypes),
    defaultAccountId: m.defaultAccountId,
    defaultAccountName: m.defaultAccount?.name ?? null,
  }));

  const clientAccountRoles: ClientAccountRole[] = accountRoles.map((r) => ({ id: r.id, name: r.name }));

  return (
    <SettingsClient
      currency={currency}
      locale={locale}
      timezone={timezone}
      categories={clientCategories}
      mediums={clientMediums}
      accounts={accounts as ClientAccount[]}
      accountRoles={clientAccountRoles}
    />
  );
}
