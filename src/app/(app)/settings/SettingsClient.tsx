"use client";

import { useState } from "react";
import LocaleSection from "./LocaleSection";
import CategoriesSection, { type ClientCategory } from "./CategoriesSection";
import MediumsSection, { type ClientMedium, type ClientAccount } from "./MediumsSection";
import AccountRolesSection, { type ClientAccountRole } from "./AccountRolesSection";
import AppearanceSection from "./AppearanceSection";
import PasswordSection from "./PasswordSection";

type Tab = "locale" | "categories" | "mediums" | "roles" | "appearance" | "password";

const TABS: { key: Tab; label: string }[] = [
  { key: "locale", label: "Locale" },
  { key: "categories", label: "Categories" },
  { key: "mediums", label: "Mediums" },
  { key: "roles", label: "Account Roles" },
  { key: "appearance", label: "Appearance" },
  { key: "password", label: "Password" },
];

export default function SettingsClient({
  currency,
  locale,
  timezone,
  categories,
  mediums,
  accounts,
  accountRoles,
}: {
  currency: string;
  locale: string;
  timezone: string;
  categories: ClientCategory[];
  mediums: ClientMedium[];
  accounts: ClientAccount[];
  accountRoles: ClientAccountRole[];
}) {
  const [tab, setTab] = useState<Tab>("locale");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-primary">Settings</h1>
        <p className="text-sm text-secondary">
          Your own locale, categories, mediums, account roles, and appearance — used everywhere in the app.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-subtle">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-accent text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "locale" && <LocaleSection currency={currency} locale={locale} timezone={timezone} />}
      {tab === "categories" && <CategoriesSection categories={categories} />}
      {tab === "mediums" && <MediumsSection mediums={mediums} accounts={accounts} />}
      {tab === "roles" && <AccountRolesSection roles={accountRoles} />}
      {tab === "appearance" && <AppearanceSection />}
      {tab === "password" && <PasswordSection />}
    </div>
  );
}
