import { UserAvatar } from "@/components/shared/user-avatar";
import type { Author } from "@/lib/selects";

/** Overlapping avatar stack: "+N" when the team is larger than `max`. */
export function MemberAvatars({ members, max = 4 }: { members: Author[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center" aria-label={`Team: ${members.map((m) => m.name).join(", ")}`} role="img">
      <div className="flex -space-x-2">
        {shown.map((m) => (
          <UserAvatar key={m.id} name={m.name} avatarKey={m.avatarKey} size="sm" className="ring-2 ring-card" />
        ))}
      </div>
      {extra > 0 ? <span className="ml-1.5 text-xs font-medium text-muted-foreground">+{extra}</span> : null}
    </div>
  );
}
