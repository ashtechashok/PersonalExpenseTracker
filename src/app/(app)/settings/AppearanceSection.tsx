"use client";

import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SettingsIcon } from "@/components/ui/icons";

export default function AppearanceSection() {
  return (
    <Card className="max-w-xl p-5">
      <div className="flex items-center gap-2 pb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--tint-rgb)/0.08)] text-accent">
          <SettingsIcon className="h-[18px] w-[18px]" />
        </span>
        <h2 className="text-sm font-medium text-primary">Appearance</h2>
      </div>

      <p className="mb-3 text-xs text-secondary">Switch between light and dark theme.</p>

      <div className="max-w-xs rounded-lg border border-default bg-surface-2">
        <ThemeToggle />
      </div>
    </Card>
  );
}
