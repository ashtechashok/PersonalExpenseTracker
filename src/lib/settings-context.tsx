"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserSettings } from "@/lib/format";

const SettingsContext = createContext<UserSettings | null>(null);

export function SettingsProvider({ settings, children }: { settings: UserSettings; children: ReactNode }) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

/** The current user's currency/locale settings — provided once in the app
 * layout from their session, so any client component can format a number or
 * date without threading settings through every prop chain. */
export function useSettings(): UserSettings {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("useSettings must be used within a SettingsProvider");
  return settings;
}
