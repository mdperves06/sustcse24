import Link from "next/link";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ACHIEVEMENT_CATEGORY_META } from "@/components/achievements/category-meta";
import { ACHIEVEMENT_CATEGORY_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AchievementItem } from "@/services/achievements";

/** Hall of Fame tile. Only ever rendered for VERIFIED achievements, hence the badge. */
export function HallOfFameCard({ achievement: a }: { achievement: AchievementItem }) {
  const meta = ACHIEVEMENT_CATEGORY_META[a.category];
  const Icon = meta.icon;
  const verified = a.status === "VERIFIED";
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="bg-brand-gradient absolute inset-x-0 top-0 h-1 opacity-80" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex size-11 items-center justify-center rounded-xl", meta.tone)}>
          <Icon className="size-5" aria-hidden />
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            <BadgeCheck className="size-3.5" aria-hidden /> Verified
          </span>
        ) : null}
      </div>
      <Badge variant="secondary" className="mt-4">
        {ACHIEVEMENT_CATEGORY_LABELS[a.category]}
      </Badge>
      <h3 className="mt-2 leading-snug font-semibold">{a.title}</h3>
      {a.description ? <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{a.description}</p> : null}
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <Link
          href={`/students/${encodeURIComponent(a.owner.roll)}`}
          className="flex min-w-0 items-center gap-2 rounded-md hover:underline"
        >
          <UserAvatar name={a.owner.name} avatarKey={a.owner.avatarKey} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{a.owner.name}</span>
            {a.achievedOn ? <span className="block text-xs text-muted-foreground">{formatDate(a.achievedOn)}</span> : null}
          </span>
        </Link>
        {a.link ? (
          <a
            href={a.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Proof <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}
