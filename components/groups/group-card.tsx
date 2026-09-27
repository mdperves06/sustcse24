import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MembershipButton } from "@/components/groups/membership-button";
import type { GroupCardView } from "@/services/groups";

export function GroupIcon({ icon, name, size = "md" }: { icon: string | null; name: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "size-16 text-4xl rounded-2xl" : "size-12 text-2xl rounded-xl";
  return (
    <span className={`flex shrink-0 items-center justify-center bg-primary/10 ${cls}`} aria-hidden>
      {icon ?? name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function GroupCard({ group }: { group: GroupCardView }) {
  const href = `/groups/${group.slug}`;
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <GroupIcon icon={group.icon} name={group.name} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">
            {/* Stretched link: the whole card opens the group; the button sits above it. */}
            <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
              {group.name}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
            {group.myRole === "MANAGER" ? (
              <Badge variant="secondary" className="ml-1">
                Manager
              </Badge>
            ) : null}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{group.description}</p>
      <div className="relative z-10 mt-4 flex justify-end">
        <MembershipButton groupId={group.id} groupName={group.name} joined={group.joined} isManager={group.myRole === "MANAGER"} />
      </div>
    </article>
  );
}
