import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { MemberMenu } from "@/components/groups/member-menu";
import type { GroupMemberView } from "@/services/groups";

export function MemberList({
  groupId,
  members,
  canManage,
  viewerId,
}: {
  groupId: string;
  members: GroupMemberView[];
  canManage: boolean;
  viewerId: string;
}) {
  return (
    <section aria-labelledby="members-title" className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <h2 id="members-title" className="mb-3 flex items-center gap-2 font-semibold">
        <Users className="size-4 text-primary" aria-hidden /> Members
        <span className="text-sm font-normal text-muted-foreground tabular-nums">({members.length})</span>
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet. Be the first to join!</p>
      ) : (
        <ul className="-mx-2 max-h-[28rem] space-y-0.5 overflow-y-auto">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
              <Link
                href={`/students/${encodeURIComponent(m.roll)}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <UserAvatar name={m.name} avatarKey={m.avatarKey} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {m.name}
                    {m.id === viewerId ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">{m.roll}</span>
                </span>
              </Link>
              {m.groupRole === "MANAGER" ? <Badge variant="secondary">Manager</Badge> : null}
              {canManage ? <MemberMenu groupId={groupId} member={{ id: m.id, name: m.name, groupRole: m.groupRole }} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
