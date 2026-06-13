import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the real dashboard's macro-layout so the layout doesn't jump when
// the data arrives. Distinct from /dashboard/loading.tsx which is shown during
// route transitions: this one is rendered inline while client-side data is
// loading (we still have client-side fetches inside the page).
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[168px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-[160px] rounded-[14px]" />
      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <Skeleton className="h-[340px] rounded-[14px]" />
        <Skeleton className="h-[340px] rounded-[14px]" />
      </div>
      <Skeleton className="h-[340px] rounded-[14px]" />
    </div>
  );
}
