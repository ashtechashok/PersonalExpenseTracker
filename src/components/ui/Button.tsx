"use client";

import type { ButtonHTMLAttributes } from "react";
import { LoaderIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 ease-out select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-white shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset] hover:bg-accent hover:shadow-[0_4px_20px_-4px_rgba(99,102,241,0.5)]",
  secondary: "bg-surface-2 text-primary border border-default hover:bg-surface-3 hover:border-strong",
  ghost: "text-secondary hover:bg-surface-2 hover:text-primary",
  danger: "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/15 hover:text-rose-200",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderIcon className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
