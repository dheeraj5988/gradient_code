import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading course">
      <div className="border-b border-border bg-surface">
        <div className="container-page space-y-4 py-10"><div className="max-w-3xl space-y-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-64" />
        </div></div>
      </div>
      <div className="container-page grid gap-6 pt-6 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:pt-8 lg:pb-10">
        <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>
        <Skeleton className="order-first h-96 lg:order-last" />
      </div>
    </div>
  );
}
