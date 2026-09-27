"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleReactionAction } from "@/actions/posts";
import type { ReactionType } from "@/lib/generated/prisma/enums";
import { REACTION_META } from "@/lib/labels";
import { REACTION_TYPES } from "@/lib/validation/posts";
import { cn } from "@/lib/utils";

export type ReactionSummaryProps = {
  counts: Record<ReactionType, number>;
  total: number;
  mine: ReactionType | null;
};

/** Pure client-side mirror of the server's toggle rule, used for the optimistic state. */
function applyToggle(s: ReactionSummaryProps, type: ReactionType): ReactionSummaryProps {
  const counts = { ...s.counts };
  let total = s.total;
  if (s.mine) {
    counts[s.mine] = Math.max(0, counts[s.mine] - 1);
    total -= 1;
  }
  if (s.mine === type) return { counts, total, mine: null };
  counts[type] += 1;
  return { counts, total: total + 1, mine: type };
}

export function ReactionBar({ postId, initial, disabled }: { postId: string; initial: ReactionSummaryProps; disabled?: boolean }) {
  const [summary, setSummary] = useState(initial);
  const [optimistic, addOptimistic] = useOptimistic(summary, applyToggle);
  const [, startTransition] = useTransition();

  function react(type: ReactionType) {
    startTransition(async () => {
      addOptimistic(type);
      try {
        const res = await toggleReactionAction(postId, type);
        startTransition(() => {
          if (res.ok && res.data) setSummary(res.data);
          else if (!res.ok) toast.error(res.error);
        });
      } catch {
        toast.error("Network error — check your connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Reactions">
      {REACTION_TYPES.map((type) => {
        const meta = REACTION_META[type];
        const count = optimistic.counts[type];
        const active = optimistic.mine === type;
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => react(type)}
            aria-pressed={active}
            aria-label={`${meta.label}${count ? ` (${count})` : ""}`}
            title={meta.label}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium tabular-nums transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
            )}
          >
            <span aria-hidden className="text-sm leading-none">
              {meta.emoji}
            </span>
            {count ? <span>{count}</span> : null}
          </button>
        );
      })}
      <span className="ml-1 text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {optimistic.total ? `${optimistic.total} reaction${optimistic.total === 1 ? "" : "s"}` : ""}
        <span className="sr-only">
          {optimistic.mine ? `, you reacted ${REACTION_META[optimistic.mine].label}` : ""}
        </span>
      </span>
    </div>
  );
}
