import { Skeleton } from "@/components/ui/skeleton";
import { FeedSkeleton } from "@/components/feed/feed-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <FeedSkeleton />
    </div>
  );
}
