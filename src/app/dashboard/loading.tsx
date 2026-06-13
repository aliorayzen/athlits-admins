import { Skeleton } from "@/components/ui/skeleton";

// Streamed during navigation between dashboard routes. Cascades to every child
// segment that doesn't define its own loading.tsx. Intentionally generic — it
// mirrors the dashboard chrome rather than any specific page's layout.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-[280px] rounded-[14px]" />
      <Skeleton className="h-[240px] rounded-[14px]" />
    </div>
  );
}
