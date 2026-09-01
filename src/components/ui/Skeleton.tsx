export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-[linear-gradient(110deg,var(--color-bg-surface-2)_8%,var(--color-bg-surface-3)_18%,var(--color-bg-surface-2)_33%)] bg-[length:200%_100%] ${className}`}
    />
  );
}
