import Link from "next/link";
import { Paperclip } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { AnnouncementView } from "@/services/announcements";
import { formatDate, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AnnouncementBadges } from "./announcement-badges";
import { SEVERITY_CARD, severityOf } from "./announcement-styles";

function excerpt(text: string, max = 240) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function AnnouncementCard({ announcement: a }: { announcement: AnnouncementView }) {
  const severity = severityOf(a.category, a.priority);
  return (
    <article
      className={cn(
        "group relative rounded-2xl border bg-card p-5 shadow-xs transition-all focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:shadow-md",
        SEVERITY_CARD[severity],
      )}
    >
      <AnnouncementBadges category={a.category} priority={a.priority} pinned={a.pinned} archived={a.archived} expired={a.expired} />
      <h2 className="mt-3 text-lg font-semibold tracking-tight">
        <Link href={`/announcements/${a.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {a.title}
        </Link>
      </h2>
      <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{excerpt(a.body)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <UserAvatar name={a.author.name} avatarKey={a.author.avatarKey} size="xs" />
          <span className="font-medium text-foreground">{a.author.name}</span>
        </span>
        <time dateTime={a.createdAt.toISOString()} title={formatDate(a.createdAt)}>
          {formatRelative(a.createdAt)}
        </time>
        {a.attachmentKey ? (
          <span className="flex items-center gap-1">
            <Paperclip className="size-3.5" aria-hidden /> Attachment
          </span>
        ) : null}
        {a.expiresAt && !a.expired ? <span>Expires {formatDate(a.expiresAt)}</span> : null}
      </div>
    </article>
  );
}
