import { Skeleton } from "@/components/ui/Skeleton";
import { cardClassName } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className={`${cardClassName} p-4 sm:p-6`}>
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${cardClassName} p-4`}>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-4 h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
