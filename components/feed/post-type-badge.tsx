import type { PostType } from "@/lib/generated/prisma/enums";
import { POST_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const TONES: Record<PostType, string> = {
  GENERAL: "bg-secondary text-secondary-foreground",
  QUESTION: "bg-chart-2/15 text-chart-2",
  DISCUSSION: "bg-chart-1/15 text-chart-1",
  ACHIEVEMENT: "bg-chart-3/15 text-chart-3",
  OPPORTUNITY: "bg-chart-5/15 text-chart-5",
  PROJECT: "bg-chart-4/15 text-chart-4",
  ANNOUNCEMENT: "bg-primary text-primary-foreground",
};

export function PostTypeBadge({ type, className }: { type: PostType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        TONES[type],
        className,
      )}
    >
      {POST_TYPE_LABELS[type]}
    </span>
  );
}
