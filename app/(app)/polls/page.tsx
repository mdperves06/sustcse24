import type { Metadata } from "next";
import { Vote } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listPolls, type PollStatus, type PollView } from "@/services/polls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CreatePollDialog } from "@/components/polls/create-poll-dialog";
import { PollCard } from "@/components/polls/poll-card";

export const metadata: Metadata = { title: "Polls" };

const SECTIONS: { status: PollStatus; title: string; empty?: string }[] = [
  { status: "active", title: "Open now", empty: "No polls are open right now." },
  { status: "upcoming", title: "Upcoming" },
  { status: "closed", title: "Closed" },
];

function PollGrid({ polls }: { polls: PollView[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {polls.map((p) => (
        <li key={p.id}>
          <PollCard poll={p} />
        </li>
      ))}
    </ul>
  );
}

export default async function PollsPage() {
  const viewer = await requireUser();
  const polls = await listPolls(viewer);
  const staff = can(viewer.role, "polls.create");

  return (
    <>
      <PageHeader
        title="Polls"
        description="Have your say on batch decisions. Results appear once you vote or when the poll closes."
        actions={staff ? <CreatePollDialog /> : null}
      />
      {polls.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="No polls yet"
          description={staff ? "Create the first poll for the batch." : "When moderators start a poll, it'll show up here."}
        />
      ) : (
        <div className="space-y-10">
          {SECTIONS.map((s) => {
            const items = polls.filter((p) => p.status === s.status);
            if (items.length === 0 && !s.empty) return null;
            return (
              <section key={s.status} aria-labelledby={`polls-${s.status}`}>
                <h2 id={`polls-${s.status}`} className="mb-3 text-lg font-semibold">
                  {s.title} <span className="text-sm font-normal text-muted-foreground tabular-nums">({items.length})</span>
                </h2>
                {items.length ? (
                  <PollGrid polls={items} />
                ) : (
                  <p className="rounded-2xl border border-dashed bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">{s.empty}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
