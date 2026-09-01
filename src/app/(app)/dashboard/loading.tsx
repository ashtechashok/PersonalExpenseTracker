import { Skeleton } from "@/components/ui/Skeleton";
import { cardClassName } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`${cardClassName} p-4`}>
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
