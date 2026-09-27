import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listGroups } from "@/services/groups";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { GroupCard } from "@/components/groups/group-card";
import { GroupFormDialog } from "@/components/groups/group-form-dialog";

export const metadata: Metadata = { title: "Interest Groups" };

function GroupGrid({ groups }: { groups: Awaited<ReturnType<typeof listGroups>> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <li key={g.id}>
          <GroupCard group={g} />
        </li>
      ))}
    </ul>
  );
}

export default async function GroupsPage() {
  const viewer = await requireUser();
  const groups = await listGroups(viewer);
  const mine = groups.filter((g) => g.joined);
  const others = groups.filter((g) => !g.joined);
  const staff = can(viewer.role, "groups.manage");

  return (
    <>
      <PageHeader
        title="Interest Groups"
        description="Find your people: join groups around what you love, share resources and discuss with like-minded batchmates."
        actions={staff ? <GroupFormDialog /> : null}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No groups yet"
          description={staff ? "Create the first interest group for the batch." : "Moderators haven't created any groups yet."}
        />
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="my-groups">
            <h2 id="my-groups" className="mb-3 text-lg font-semibold">
              Your groups <span className="text-sm font-normal text-muted-foreground tabular-nums">({mine.length})</span>
            </h2>
            {mine.length ? (
              <GroupGrid groups={mine} />
            ) : (
              <p className="rounded-2xl border border-dashed bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
                You haven&apos;t joined any groups yet. Pick a few below to get started.
              </p>
            )}
          </section>
          {others.length ? (
            <section aria-labelledby="discover-groups">
              <h2 id="discover-groups" className="mb-3 text-lg font-semibold">
                Discover <span className="text-sm font-normal text-muted-foreground tabular-nums">({others.length})</span>
              </h2>
              <GroupGrid groups={others} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
