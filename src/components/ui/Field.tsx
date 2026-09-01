import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "./icons";

export const inputClass =
  "w-full rounded-lg border border-default bg-surface-2 px-3 py-2.5 text-sm text-primary placeholder:text-tertiary transition-colors duration-150 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-[rgb(var(--tint-rgb)/0.02)] disabled:text-tertiary";

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`${inputClass} appearance-none pr-9 [&>option]:bg-[var(--color-bg-surface-2)] ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-tertiary" />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  full,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label className="text-xs font-medium tracking-wide text-secondary">{label}</label>
      {children}
      {hint && <p className="text-xs text-tertiary">{hint}</p>}
    </div>
  );
}
