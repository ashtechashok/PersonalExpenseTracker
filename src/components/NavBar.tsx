"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import {
  WalletIcon,
  LandmarkIcon,
  LayersIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  DashboardIcon,
  RepeatIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/transactions", label: "Transactions", icon: WalletIcon },
  { href: "/recurring", label: "Recurring", icon: RepeatIcon },
  { href: "/accounts", label: "Accounts", icon: LandmarkIcon },
  { href: "/emi", label: "EMI", icon: LayersIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const ADMIN_LINK = { href: "/users", label: "Users", icon: UsersIcon };

const COLLAPSE_KEY = "expenseTracker.sidebarCollapsed";

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset]">
        E
      </div>
      {!collapsed && <span className="truncate text-[15px] font-semibold text-primary">Expense Tracker</span>}
    </div>
  );
}

function NavLinks({
  pathname,
  collapsed,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const links = isAdmin ? [...LINKS, ADMIN_LINK] : LINKS;
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={collapsed ? link.label : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-[rgb(var(--tint-rgb)/0.06)] text-primary"
                : "text-secondary hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:text-primary"
            } ${collapsed ? "justify-center" : ""}`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
            )}
            <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? "text-accent" : "text-tertiary group-hover:text-secondary"}`} />
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export default function NavBar({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-subtle bg-base/90 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Brand />
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-[rgb(var(--tint-rgb)/0.06)] hover:text-primary"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-overlay backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col gap-6 border-r border-subtle bg-surface p-4 shadow-elevated duration-300 animate-slide-up">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-[rgb(var(--tint-rgb)/0.06)] hover:text-primary"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
            <div className="flex flex-col gap-1 border-t border-subtle pt-3">
              <p className="truncate px-3 text-xs text-tertiary">{email}</p>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:text-primary"
                >
                  <LogOutIcon className="h-[18px] w-[18px]" />
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col gap-6 border-r border-subtle bg-surface p-4 transition-[width] duration-200 md:flex ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <div className={collapsed ? "flex justify-center" : ""}>
          <Brand collapsed={collapsed} />
        </div>

        <NavLinks pathname={pathname} collapsed={collapsed} isAdmin={isAdmin} />

        <div className="flex flex-col gap-1 border-t border-subtle pt-3">
          {!collapsed && <p className="truncate px-3 text-xs text-tertiary">{email}</p>}
          <form action={logoutAction}>
            <button
              type="submit"
              title={collapsed ? "Logout" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:text-primary ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <LogOutIcon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && "Logout"}
            </button>
          </form>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-tertiary transition-colors hover:bg-[rgb(var(--tint-rgb)/0.04)] hover:text-secondary ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? (
              <ChevronRightIcon className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <>
                <ChevronLeftIcon className="h-[18px] w-[18px] shrink-0" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
