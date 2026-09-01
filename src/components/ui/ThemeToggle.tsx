"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

const THEME_KEY = "expenseTracker.theme";
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Reflect whatever the FOUC-prevention script (in layout.tsx) already
    // applied to <html>, rather than re-deciding here.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? (isLight ? "Switch to dark theme" : "Switch to light theme") : undefined}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:text-secondary ${
        collapsed ? "justify-center" : ""
      }`}
    >
      {isLight ? <SunIcon className="h-[18px] w-[18px] shrink-0" /> : <MoonIcon className="h-[18px] w-[18px] shrink-0" />}
      {!collapsed && <span>{isLight ? "Light Theme" : "Dark Theme"}</span>}
    </button>
  );
}
