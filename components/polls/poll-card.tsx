import { CalendarClock, EyeOff, ListChecks, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/shared/rich-text";
import { PollAdminActions } from "@/components/polls/poll-admin-actions";
import { PollResults } from "@/components/polls/poll-results";
import { PollVoteForm } from "@/components/polls/poll-vote-form";
import { formatDateTime, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { PollStatus, PollView } from "@/services/polls";

const STATUS: Record<PollStatus, { label: string; className: string }> = {
  active: { label: "Open", className: "bg-success/15 text-success" },
  upcoming: { label: "Upcoming", className: "bg-chart-3/15 text-chart-3" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

function timing(poll: PollView) {
  if (poll.status === "upcoming") return `Opens ${formatRelative(poll.startsAt)} · ${formatDateTime(poll.startsAt)}`;
  if (poll.status === "closed") return poll.endsAt ? `Closed ${formatDateTime(poll.endsAt)}` : "Closed";
  return poll.endsAt ? `Closes ${formatRelative(poll.endsAt)} · ${formatDateTime(poll.endsAt)}` : "Open until closed by staff";
}

export function PollCard({ poll }: { poll: PollView }) {
  const status = STATUS[poll.status];
  return (
    <article
      aria-labelledby={`poll-${poll.id}`}
      className={cn("flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs", poll.status === "closed" && "bg-card/70")}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", status.className)}>{status.label}</span>
        {poll.multipleChoice ? (
          <Badge variant="outline">
            <ListChecks aria-hidden /> Multiple choice
          </Badge>
        ) : null}
        {poll.anonymous ? (
          <Badge variant="outline">
            <EyeOff aria-hidden /> Anonymous
          </Badge>
        ) : null}
      </div>
      <h3 id={`poll-${poll.id}`} className="mt-3 text-lg font-semibold leading-snug break-words">
        {poll.question}
      </h3>
      {poll.description ? <RichText text={poll.description} className="mt-1 text-muted-foreground" /> : null}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5 shrink-0" aria-hidden />
        {timing(poll)}
      </p>

      <div className="mt-4 flex-1">
        {poll.canVote ? (
          <>
            <PollVoteForm pollId={poll.id} options={poll.options.map((o) => ({ id: o.id, label: o.label }))} multipleChoice={poll.multipleChoice} />
            {poll.showResults ? (
              <details className="mt-4 rounded-xl border bg-muted/30 px-3.5 py-2.5">
                <summary className="cursor-pointer text-sm font-medium select-none">Live results (staff)</summary>
                <div className="mt-3">
                  <PollResults poll={poll} />
                </div>
              </details>
            ) : null}
          </>
        ) : poll.showResults ? (
          <>
            {poll.canManage && !poll.hasVoted && poll.status !== "closed" ? (
              <p className="mb-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Live results (visible to staff).{poll.status === "upcoming" ? " Voting hasn't started yet." : ""}
              </p>
            ) : null}
            <PollResults poll={poll} />
          </>
        ) : (
          <div className="space-y-2">
            {poll.options.map((o) => (
              <p key={o.id} className="rounded-xl border border-dashed px-3.5 py-2.5 text-sm text-muted-foreground">
                {o.label}
              </p>
            ))}
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden /> Voting opens {formatDateTime(poll.startsAt)}.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          By {poll.createdBy.name} · {formatRelative(poll.createdAt)}
        </p>
        {poll.canManage ? <PollAdminActions pollId={poll.id} canClose={poll.status !== "closed"} /> : null}
      </div>
    </article>
  );
}
