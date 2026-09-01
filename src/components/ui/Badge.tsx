import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "teal" | "violet";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-[rgb(var(--tint-rgb)/0.06)] text-secondary border-[rgb(var(--tint-rgb)/0.08)]",
  accent: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  danger: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  teal: "bg-teal-500/10 text-teal-300 border-teal-500/20",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
