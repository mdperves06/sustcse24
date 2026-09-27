import Link from "next/link";
import { EyeOff, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CommentMenu } from "@/components/feed/comment-menu";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { CommentView } from "@/services/posts";

export function CommentList({ comments }: { comments: CommentView[] }) {
  if (comments.length === 0) {
    return <EmptyState icon={MessageCircle} title="No comments yet" description="Be the first to reply." className="py-8" />;
  }
  return (
    <ul className="space-y-4">
      {comments.map((c) => {
        const profile = `/students/${encodeURIComponent(c.author.roll)}`;
        return (
          <li key={c.id} className="flex items-start gap-3">
            <Link href={profile} tabIndex={-1} aria-hidden className="shrink-0">
              <UserAvatar name={c.author.name} avatarKey={c.author.avatarKey} size="sm" />
            </Link>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-2xl bg-muted/60 px-3.5 py-2.5",
                c.removed && "border border-dashed border-destructive/40 bg-destructive/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
                  <Link href={profile} className="font-semibold hover:underline">
                    {c.author.name}
                  </Link>
                  {c.author.role !== "STUDENT" ? <Badge variant="secondary">{ROLE_LABELS[c.author.role]}</Badge> : null}
                  <time dateTime={c.createdAt.toISOString()} title={formatDateTime(c.createdAt)} className="text-xs text-muted-foreground">
                    {formatRelative(c.createdAt)}
                  </time>
                </p>
                <CommentMenu
                  comment={{
                    id: c.id,
                    removed: c.removed,
                    isAuthor: c.isAuthor,
                    canDelete: c.canDelete,
                    canModerate: c.canModerate,
                    canReport: c.canReport,
                  }}
                />
              </div>
              {c.removed ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <EyeOff className="size-3.5" aria-hidden /> Removed by moderator. Hidden from students.
                </p>
              ) : null}
              <RichText text={c.content} className="mt-0.5" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
