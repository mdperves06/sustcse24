"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimisticToggle } from "@/components/projects/use-optimistic-toggle";
import { setOpportunityBookmarkAction } from "@/actions/opportunities";
import { cn } from "@/lib/utils";

export function OpportunityBookmarkButton({
  id,
  title,
  saved: initial,
  showLabel = false,
}: {
  id: string;
  title: string;
  saved: boolean;
  showLabel?: boolean;
}) {
  const { on: saved, toggle } = useOptimisticToggle(initial, (next) => setOpportunityBookmarkAction(id, next));

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "ghost"}
      size={showLabel ? "sm" : "icon-sm"}
      onClick={toggle}
      aria-pressed={saved}
      aria-label={showLabel ? undefined : saved ? `Unsave ${title}` : `Save ${title}`}
      title={saved ? "Saved — click to remove" : "Save for later"}
      className={cn(saved && "text-primary")}
    >
      {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {showLabel ? (saved ? "Saved" : "Save") : null}
    </Button>
  );
}
