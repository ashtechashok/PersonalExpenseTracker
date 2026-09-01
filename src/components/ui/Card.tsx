import type { HTMLAttributes } from "react";

export const cardClassName = "rounded-2xl border border-subtle bg-surface shadow-card transition-shadow duration-200";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${cardClassName} ${className}`} {...props} />;
}
