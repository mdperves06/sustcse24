import { BadgeCheck, Clock, ExternalLink, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { deleteAchievementAction } from "@/actions/achievements";
import { ACHIEVEMENT_CATEGORY_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import type { AchievementItem } from "@/services/achievements";

export function StatusBadge({ status }: { status: AchievementItem["status"] }) {
  if (status === "VERIFIED")
    return (
      <Badge className="bg-primary/10 text-primary">
        <BadgeCheck aria-hidden /> Verified
      </Badge>
    );
  if (status === "REJECTED")
    return (
      <Badge variant="destructive">
        <XCircle aria-hidden /> Rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-warning/40 text-warning">
      <Clock aria-hidden /> Pending review
    </Badge>
  );
}

export function MySubmissions({ items }: { items: AchievementItem[] }) {
  return (
    <ul className="divide-y rounded-2xl border bg-card shadow-xs">
      {items.map((a) => (
        <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={a.status} />
              <span className="text-xs text-muted-foreground">
                {ACHIEVEMENT_CATEGORY_LABELS[a.category]}
                {a.achievedOn ? ` · ${formatDate(a.achievedOn)}` : ""} · submitted {formatDate(a.createdAt)}
              </span>
            </div>
            <p className="font-medium">{a.title}</p>
            {a.status === "REJECTED" && a.rejectionReason ? (
              <p className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <span className="font-medium">Reason:</span> {a.rejectionReason}
              </p>
            ) : null}
            {a.link ? (
              <a href={a.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Proof link <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
          </div>
          {a.status === "PENDING" ? (
            <ConfirmAction
              title="Delete this submission?"
              description="It will be removed from the review queue."
              confirmLabel="Delete"
              action={deleteAchievementAction.bind(null, a.id)}
              trigger={
                <Button variant="ghost" size="sm" className="self-start">
                  <Trash2 aria-hidden /> Delete
                </Button>
              }
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
