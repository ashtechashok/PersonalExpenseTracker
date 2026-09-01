import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center animate-fade-in">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--tint-rgb)/0.04)] text-tertiary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-secondary">{title}</p>
        {description && <p className="mt-1 text-xs text-tertiary">{description}</p>}
      </div>
    </div>
  );
}
