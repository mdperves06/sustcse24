"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimisticToggle } from "@/components/projects/use-optimistic-toggle";
import { setProjectBookmarkAction, setProjectLikeAction } from "@/actions/projects";
import { cn } from "@/lib/utils";

export function ProjectLikeButton({ id, liked, likeCount }: { id: string; liked: boolean; likeCount: number }) {
  const [count, setCount] = useState(likeCount);
  const { on, toggle } = useOptimisticToggle(liked, (next) => setProjectLikeAction(id, next), {
    onChange: (next) => setCount((c) => Math.max(0, c + (next ? 1 : -1))),
    onSuccess: (data) => {
      if (data) setCount(data.likeCount);
    },
    onRevert: (value) => setCount((c) => Math.max(0, c + (value ? 1 : -1))),
  });

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggle}
      aria-pressed={on}
      aria-label={`${on ? "Unlike" : "Like"} this project (${count} like${count === 1 ? "" : "s"})`}
      className={cn(on && "border-destructive/30 text-destructive")}
    >
      <Heart className={cn(on && "fill-current")} aria-hidden />
      {on ? "Liked" : "Like"}
      <span className="tabular-nums" aria-hidden>
        · {count}
      </span>
    </Button>
  );
}

export function ProjectBookmarkButton({ id, bookmarked }: { id: string; bookmarked: boolean }) {
  const { on, toggle } = useOptimisticToggle(bookmarked, (next) => setProjectBookmarkAction(id, next));
  return (
    <Button
      type="button"
      variant={on ? "secondary" : "outline"}
      onClick={toggle}
      aria-pressed={on}
      className={cn(on && "text-primary")}
    >
      {on ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {on ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}
