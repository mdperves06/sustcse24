import { Ban, Clock, KeyRound, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  MODERATOR: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  STUDENT: "bg-muted text-muted-foreground",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={cn(ROLE_STYLES[role])}>
      {role !== "STUDENT" ? <ShieldCheck aria-hidden /> : null}
      {ROLE_LABELS[role]}
    </Badge>
  );
}

/** Status summary for an account: deleted › disabled › active, plus lock / default password / restriction flags. */
export function AccountBadges({
  status,
  deleted,
  locked,
  mustChangePassword,
  restricted,
  compact = false,
}: {
  status: "ACTIVE" | "DISABLED";
  deleted: boolean;
  locked: boolean;
  mustChangePassword: boolean;
  restricted: boolean;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {deleted ? (
        <Badge variant="destructive">
          <Trash2 aria-hidden /> Deleted
        </Badge>
      ) : status === "DISABLED" ? (
        <Badge variant="destructive">
          <Ban aria-hidden /> Disabled
        </Badge>
      ) : (
        <Badge variant="outline" className="border-chart-5/30 bg-chart-5/10 text-chart-5">
          Active
        </Badge>
      )}
      {locked ? (
        <Badge variant="outline" className="border-chart-3/30 bg-chart-3/10 text-chart-3" title="Locked after failed sign-ins">
          <Lock aria-hidden /> {compact ? <span className="sr-only">Locked</span> : "Locked"}
        </Badge>
      ) : null}
      {mustChangePassword ? (
        <Badge variant="outline" className="border-chart-3/30 bg-chart-3/10 text-chart-3" title="Still on the default password">
          <KeyRound aria-hidden /> {compact ? <span className="sr-only">Default password</span> : "Default password"}
        </Badge>
      ) : null}
      {restricted ? (
        <Badge variant="outline" className="border-chart-4/30 bg-chart-4/10 text-chart-4" title="Posting restricted">
          <Clock aria-hidden /> {compact ? <span className="sr-only">Restricted</span> : "Restricted"}
        </Badge>
      ) : null}
    </span>
  );
}

export function CompletionMeter({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-chart-5" : value >= 50 ? "bg-primary" : value >= 25 ? "bg-chart-3" : "bg-destructive";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{value}%</span>
    </span>
  );
}
