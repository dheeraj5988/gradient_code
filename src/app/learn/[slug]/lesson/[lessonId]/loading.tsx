import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading lesson">
      <Skeleton className="aspect-video max-h-[68vh] w-full rounded-none" />
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-6 sm:px-6">
        <Skeleton className="h-4 w-60" /><Skeleton className="h-7 w-2/3" /><Skeleton className="mt-6 h-40" />
      </div>
    </div>
  );
}
