"use client";

import { useEffect, useRef, useState } from "react";
import { Card, cardClassName } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import {
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  BanknoteIcon,
  PiggyBankIcon,
  CreditCardIcon,
  HandCoinsIcon,
  RepeatIcon,
  SlidersIcon,
  RotateCcwIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/components/ui/icons";
import { formatCurrency as formatCurrencyShared, type UserSettings } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";
import { useToast } from "@/components/ui/Toast";
import { updateCardVisibility } from "./actions";

export type Summary = {
  monthSpent: number;
  monthIncome: number;
  availableBalance: number;
  creditOutstanding: number;
  // One total per distinct account role in use — see summarizeAccounts in
  // lib/balances.ts. Every role gets its own card below, whatever it's
  // named; nothing here is specially tied to any particular role name.
  roleTotals: { role: string; total: number }[];
  yetToReceive: number;
  recurringDueCount: number;
  recurringDueTotal: number;
};

type SummaryCardDef = {
  key: string;
  label: string;
  icon: typeof BanknoteIcon;
  iconBg: string;
  iconColor: string;
  value: (s: Summary, settings: UserSettings) => string;
  valueClass?: (s: Summary) => string | undefined;
};

// Each card gets its own colored icon badge so the strip reads at a glance
// instead of every tile looking the same — tones are chosen to echo the
// card's meaning (red for money out, green for money in, etc.).
const STATIC_CARD_DEFS: SummaryCardDef[] = [
  {
    key: "monthSpent",
    label: "Spent This Month",
    icon: ArrowDownRightIcon,
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-300",
    value: (s, settings) => formatCurrencyShared(s.monthSpent, settings),
    valueClass: () => "text-rose-300",
  },
  {
    key: "monthIncome",
    label: "Income This Month",
    icon: ArrowUpRightIcon,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-300",
    value: (s, settings) => formatCurrencyShared(s.monthIncome, settings),
    valueClass: () => "text-emerald-300",
  },
  {
    key: "availableBalance",
    label: "Available Balance",
    icon: BanknoteIcon,
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-300",
    value: (s, settings) => formatCurrencyShared(s.availableBalance, settings),
    valueClass: (s) => (s.availableBalance < 0 ? "text-rose-400" : undefined),
  },
  {
    key: "creditOutstanding",
    label: "Credit Outstanding",
    icon: CreditCardIcon,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-300",
    value: (s, settings) => formatCurrencyShared(s.creditOutstanding, settings),
  },
  {
    key: "yetToReceive",
    label: "Yet to Receive",
    icon: HandCoinsIcon,
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-300",
    value: (s, settings) => formatCurrencyShared(s.yetToReceive, settings),
    valueClass: () => "text-amber-300",
  },
  {
    key: "recurringDueTotal",
    label: "Recurring Due",
    icon: RepeatIcon,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-300",
    value: (s, settings) =>
      s.recurringDueCount > 0 ? `${s.recurringDueCount} pending · ${formatCurrencyShared(s.recurringDueTotal, settings)}` : "All settled",
    valueClass: (s) => (s.recurringDueCount > 0 ? "text-violet-300" : undefined),
  },
];

function defaultCardVisibility(defs: SummaryCardDef[]): Record<string, boolean> {
  return Object.fromEntries(defs.map((c) => [c.key, true]));
}

// Sized and styled to match the account cards on the Accounts tab (same
// grid minmax, same icon-badge size) so the two pages feel consistent.
function SummaryCard({
  label,
  value,
  valueClass,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon: typeof BanknoteIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="group flex flex-col gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div>
        <p className="text-xs text-tertiary">{label}</p>
        <p className={`text-lg font-semibold tabular-nums text-primary ${valueClass ?? ""}`}>{value}</p>
      </div>
    </Card>
  );
}

export default function DashboardClient({
  summary,
  initialCardVisibility,
}: {
  summary: Summary;
  initialCardVisibility: Record<string, boolean>;
}) {
  const settings = useSettings();
  const toast = useToast();

  // One card per distinct account role, in addition to the fixed cards
  // above — a user's own custom roles (see the Account Roles tab on
  // /settings) work identically to the seeded defaults, whatever they're
  // named. Noisy/unwanted ones (e.g. the default "General" role) can be
  // hidden with the same "Customize Cards" toggle as any other card below.
  const roleCardDefs: SummaryCardDef[] = summary.roleTotals.map((rt) => ({
    key: `role:${rt.role}`,
    label: rt.role,
    icon: PiggyBankIcon,
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-300",
    value: (_s, settings) => formatCurrencyShared(rt.total, settings),
    valueClass: () => "text-teal-300",
  }));
  const allCardDefs = [...STATIC_CARD_DEFS, ...roleCardDefs];

  // Seeded straight from the server (Settings/User.cardVisibility) — no
  // localStorage hydration needed, so hiding a card sticks across every
  // device/browser the user logs into, not just this one.
  const [cardVisibility, setCardVisibility] = useState<Record<string, boolean>>(() => ({
    ...defaultCardVisibility(allCardDefs),
    ...initialCardVisibility,
  }));
  const [visibilityPanelOpen, setVisibilityPanelOpen] = useState(false);
  const visibilityPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visibilityPanelOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (visibilityPanelRef.current && !visibilityPanelRef.current.contains(e.target as Node)) {
        setVisibilityPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [visibilityPanelOpen]);

  // Only the hidden (false) entries are worth persisting — a key absent
  // from storage already means "visible" by default.
  function persist(next: Record<string, boolean>) {
    const hiddenOnly = Object.fromEntries(Object.entries(next).filter(([, visible]) => !visible));
    updateCardVisibility(hiddenOnly).then((result) => {
      if (result.error) toast.error("Couldn't save card preference — try again.");
    });
  }

  function toggleCard(key: string) {
    // Computed outside the updater (not setCardVisibility(prev => ...)) since
    // a setState updater can run more than once for one call (e.g. React
    // Strict Mode in dev) — persist(next) is a side effect and must only
    // ever fire exactly once per click.
    const next = { ...cardVisibility, [key]: !cardVisibility[key] };
    setCardVisibility(next);
    persist(next);
  }

  function showAllCards() {
    const next = defaultCardVisibility(allCardDefs);
    setCardVisibility(next);
    persist(next);
  }

  return (
    <div className="space-y-6">
      {/* Summary cards + visibility panel */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-secondary">Overview</h2>
        <div className="relative" ref={visibilityPanelRef}>
          <button
            type="button"
            onClick={() => setVisibilityPanelOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-default bg-surface-2 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-3 hover:border-strong"
          >
            <SlidersIcon className="h-3.5 w-3.5" />
            Customize Cards
          </button>
          {visibilityPanelOpen && (
            <div
              className={`${cardClassName} absolute right-0 z-20 mt-2 w-[19rem] animate-scale-in origin-top-right p-3 shadow-elevated`}
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="text-sm font-semibold text-primary">Summary Cards</span>
                <button
                  type="button"
                  onClick={showAllCards}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-tertiary transition-colors hover:bg-[rgb(var(--tint-rgb)/0.06)] hover:text-secondary"
                >
                  <RotateCcwIcon className="h-3 w-3" />
                  Show all
                </button>
              </div>
              <div className="flex flex-col">
                {allCardDefs.map((c) => {
                  const visible = cardVisibility[c.key] ?? true;
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.iconBg} ${c.iconColor}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 truncate text-sm text-secondary">{c.label}</span>
                      {visible ? (
                        <EyeIcon className="h-4 w-4 shrink-0 text-tertiary" />
                      ) : (
                        <EyeOffIcon className="h-4 w-4 shrink-0 text-tertiary" />
                      )}
                      <Switch checked={visible} onChange={() => toggleCard(c.key)} label={`Toggle ${c.label} card`} />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 border-t border-subtle px-1 pt-2 text-xs text-tertiary">
                Hidden cards can be turned back on anytime.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {allCardDefs
          .filter((c) => cardVisibility[c.key] ?? true)
          .map((c) => (
            <SummaryCard
              key={c.key}
              label={c.label}
              icon={c.icon}
              iconBg={c.iconBg}
              iconColor={c.iconColor}
              value={c.value(summary, settings)}
              valueClass={c.valueClass?.(summary)}
            />
          ))}
      </div>
    </div>
  );
}
