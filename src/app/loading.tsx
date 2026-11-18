import { Skeleton } from "@/components/ui/EmptyState";

export default function Loading() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-[16px]" />
        ))}
      </div>

      <Skeleton className="h-[440px] rounded-[16px]" />
    </div>
  );
}
