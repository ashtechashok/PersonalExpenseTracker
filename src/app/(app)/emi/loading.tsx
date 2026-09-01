import { Skeleton } from "@/components/ui/Skeleton";
import { cardClassName } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className={`${cardClassName} p-4`}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-6 w-28" />
      </div>
      <div className={`${cardClassName} p-4 sm:p-6`}>
        <Skeleton className="h-5 w-16" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
