import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <Skeleton className="mt-5 h-7 w-56" />
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading posts…</span>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
