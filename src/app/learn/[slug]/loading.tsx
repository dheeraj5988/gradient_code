import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-72" /><Skeleton className="h-32" />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}
