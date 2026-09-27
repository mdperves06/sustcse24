"use client";

import { useState } from "react";
import { Check, HelpCircle, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-action-form";
import { rsvpAction } from "@/actions/events";
import type { RsvpStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { RSVP_LABELS } from "./event-labels";

const OPTIONS: { status: RsvpStatus; icon: typeof Check; active: string }[] = [
  { status: "GOING", icon: Check, active: "border-success bg-success/10 text-success hover:bg-success/15" },
  { status: "MAYBE", icon: HelpCircle, active: "border-warning bg-warning/10 text-warning hover:bg-warning/15" },
  { status: "NOT_GOING", icon: X, active: "border-foreground/30 bg-muted text-foreground" },
];

export function RsvpControl({
  eventId,
  status,
  open,
  closedReason,
}: {
  eventId: string;
  status: RsvpStatus | null;
  open: boolean;
  closedReason?: string;
}) {
  const [current, setCurrent] = useState(status);
  const [target, setTarget] = useState<RsvpStatus | null>(null);
  const { pending, run } = useServerAction();

  if (!open) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden /> {closedReason ?? "RSVPs are closed."}
        </p>
        {current ? (
          <p className="text-sm">
            Your response: <strong>{RSVP_LABELS[current]}</strong>
          </p>
        ) : null}
      </div>
    );
  }

  function choose(next: RsvpStatus) {
    if (next === current || pending) return; // choosing the current answer again is a no-op
    setTarget(next);
    run(() => rsvpAction(eventId, next), { onSuccess: (data) => data && setCurrent(data.status) });
  }

  return (
    <div role="group" aria-label="Your RSVP" className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ status: s, icon: Icon, active }) => {
        const selected = current === s;
        return (
          <Button
            key={s}
            type="button"
            variant="outline"
            aria-pressed={selected}
            disabled={pending}
            onClick={() => choose(s)}
            className={cn("h-10 flex-col gap-0.5 sm:flex-row sm:gap-1.5", selected && active)}
          >
            {pending && target === s ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
            <span className="text-xs sm:text-sm">{RSVP_LABELS[s]}</span>
          </Button>
        );
      })}
    </div>
  );
}
