import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4"><Skeleton className="h-6 w-40" /></div>
      <div className="grid flex-1 lg:grid-cols-[320px_1fr]">
        <div className="hidden space-y-3 border-r border-border p-4 lg:block">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        <div><Skeleton className="aspect-video max-h-[70vh] w-full rounded-none" /><div className="mx-auto max-w-4xl space-y-3 p-6"><Skeleton className="h-4 w-40" /><Skeleton className="h-7 w-2/3" /></div></div>
      </div>
    </div>
  );
}
