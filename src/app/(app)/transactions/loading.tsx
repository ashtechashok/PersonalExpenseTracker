import { Skeleton } from "@/components/ui/Skeleton";
import { cardClassName } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className={`${cardClassName} p-4 sm:p-6`}>
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className={`${cardClassName} p-4 sm:p-6`}>
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
