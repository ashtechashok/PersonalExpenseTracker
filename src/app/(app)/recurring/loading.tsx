import { Skeleton } from "@/components/ui/Skeleton";
import { cardClassName } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className={`${cardClassName} p-4 sm:p-6`}>
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
