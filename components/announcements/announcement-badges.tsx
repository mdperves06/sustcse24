import { Archive, Clock, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ANNOUNCEMENT_CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { AnnouncementCategory, Priority } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLE, PRIORITY_STYLE } from "./announcement-styles";

export function AnnouncementBadges({
  category,
  priority,
  pinned,
  archived,
  expired,
}: {
  category: AnnouncementCategory;
  priority: Priority;
  pinned: boolean;
  archived: boolean;
  expired: boolean;
}) {
  const CategoryIcon = CATEGORY_STYLE[category].icon;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pinned ? (
        <Badge variant="outline" className="border-primary/40 text-primary">
          <Pin aria-hidden /> Pinned
        </Badge>
      ) : null}
      <Badge className={CATEGORY_STYLE[category].badge}>
        <CategoryIcon aria-hidden /> {ANNOUNCEMENT_CATEGORY_LABELS[category]}
      </Badge>
      {priority !== "NORMAL" ? (
        <Badge variant="outline" className={cn(PRIORITY_STYLE[priority])}>
          {PRIORITY_LABELS[priority]} priority
        </Badge>
      ) : null}
      {archived ? (
        <Badge variant="secondary">
          <Archive aria-hidden /> Archived
        </Badge>
      ) : expired ? (
        <Badge variant="secondary">
          <Clock aria-hidden /> Expired
        </Badge>
      ) : null}
    </div>
  );
}
