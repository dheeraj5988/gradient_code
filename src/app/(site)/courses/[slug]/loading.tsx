import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading course">
      <div className="border-b border-border bg-surface">
        <div className="container-page space-y-4 py-10 lg:max-w-[calc(100%-400px)]">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>
        <Skeleton className="order-first h-96 lg:order-last" />
      </div>
    </div>
  );
}
