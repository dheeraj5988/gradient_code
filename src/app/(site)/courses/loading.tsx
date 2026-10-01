import { CourseCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8 sm:py-10" aria-busy="true" aria-label="Loading courses">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Skeleton className="h-11 lg:hidden" />
        <div className="hidden space-y-4 lg:block">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}</div>
      </div>
    </div>
  );
}
