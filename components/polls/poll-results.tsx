import Link from "next/link";
import { Check, Users } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { PollView } from "@/services/polls";

/** CSS-only horizontal bar results. Voter lists only exist in the data for staff on non-anonymous polls. */
export function PollResults({ poll }: { poll: PollView }) {
  const total = poll.totalVoters ?? 0;
  const max = Math.max(0, ...poll.options.map((o) => o.votes ?? 0));

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5" aria-label="Results">
        {poll.options.map((o) => {
          const votes = o.votes ?? 0;
          // For multiple choice, percentages are of voters (they can add up to more than 100%).
          const pct = total ? Math.round((votes / total) * 100) : 0;
          const mine = poll.myChoices.includes(o.id);
          const leading = votes > 0 && votes === max;
          return (
            <li key={o.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn("flex min-w-0 items-center gap-1.5 break-words", mine && "font-semibold")}>
                  {mine ? <Check className="size-3.5 shrink-0 text-primary" aria-label="Your choice" /> : null}
                  {o.label}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {votes} vote{votes === 1 ? "" : "s"} · <span className="font-medium text-foreground">{pct}%</span>
                </span>
              </div>
              <div
                className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`${o.label}: ${pct}%`}
              >
                <div
                  className={cn("h-full rounded-full transition-[width] duration-500", mine ? "bg-primary" : leading ? "bg-chart-2" : "bg-muted-foreground/40")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {o.voters && o.voters.length ? (
                <details className="mt-1.5 text-xs">
                  <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
                    Show who voted ({o.voters.length})
                  </summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {o.voters.map((v) => (
                      <li key={v.id}>
                        <Link
                          href={`/students/${encodeURIComponent(v.roll)}`}
                          className="inline-flex items-center gap-1.5 rounded-full border bg-background py-0.5 pr-2.5 pl-0.5 hover:bg-muted"
                        >
                          <UserAvatar name={v.name} avatarKey={v.avatarKey} size="xs" />
                          {v.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" aria-hidden />
        {total} voter{total === 1 ? "" : "s"}
        {poll.multipleChoice ? " · multiple answers allowed, so totals can exceed 100%" : ""}
      </p>
    </div>
  );
}
