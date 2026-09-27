import Link from "next/link";
import { ExternalLink, EyeOff, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PostImages } from "@/components/feed/post-images";
import { PostMenu } from "@/components/feed/post-menu";
import { PostTypeBadge } from "@/components/feed/post-type-badge";
import { ReactionBar } from "@/components/feed/reaction-bar";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { PostView } from "@/services/posts";

function linkLabel(url: string) {
  try {
    const u = new URL(url);
    return { host: u.hostname.replace(/^www\./, ""), rest: `${u.pathname}${u.search}`.replace(/^\/$/, "") };
  } catch {
    return { host: url, rest: "" };
  }
}

export function PostAuthorLine({ author, createdAt, editedAt, href }: {
  author: PostView["author"];
  createdAt: Date;
  editedAt?: Date | null;
  href?: string;
}) {
  const profile = `/students/${encodeURIComponent(author.roll)}`;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link href={profile} className="shrink-0 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" tabIndex={-1} aria-hidden>
        <UserAvatar name={author.name} avatarKey={author.avatarKey} size="md" />
      </Link>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          <Link href={profile} className="truncate font-semibold hover:underline">
            {author.name}
          </Link>
          {author.role !== "STUDENT" ? <Badge variant="secondary">{ROLE_LABELS[author.role]}</Badge> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {href ? (
            <Link href={href} className="hover:underline">
              <time dateTime={createdAt.toISOString()} title={formatDateTime(createdAt)}>
                {formatRelative(createdAt)}
              </time>
            </Link>
          ) : (
            <time dateTime={createdAt.toISOString()} title={formatDateTime(createdAt)}>
              {formatRelative(createdAt)}
            </time>
          )}
          {editedAt ? (
            <span title={`Edited ${formatDateTime(editedAt)}`}>
              {" · "}edited
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function PostCard({
  post,
  allowAnnouncement,
  detail = false,
  showGroup = false,
}: {
  post: PostView;
  allowAnnouncement: boolean;
  /** Full view on /feed/[id]: no clamping, delete redirects back to the feed. */
  detail?: boolean;
  /** Show which group a post belongs to (detail page of a group post). */
  showGroup?: boolean;
}) {
  const href = `/feed/${post.id}`;
  const link = post.linkUrl ? linkLabel(post.linkUrl) : null;

  return (
    <article
      aria-labelledby={`post-${post.id}-author`}
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-xs sm:p-5",
        post.removed && "border-dashed border-destructive/40 bg-destructive/[0.03]",
      )}
    >
      {post.removed ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Removed by moderator. Hidden from students.
            {post.removedReason ? <span className="font-normal"> Reason: {post.removedReason}</span> : null}
          </span>
        </div>
      ) : null}

      <header className="flex items-start justify-between gap-3">
        <div id={`post-${post.id}-author`} className="min-w-0">
          <PostAuthorLine author={post.author} createdAt={post.createdAt} editedAt={post.editedAt} href={detail ? undefined : href} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PostTypeBadge type={post.type} />
          <PostMenu
            post={{
              id: post.id,
              type: post.type,
              content: post.content,
              linkUrl: post.linkUrl,
              removed: post.removed,
              canEdit: post.canEdit,
              canDelete: post.canDelete,
              canModerate: post.canModerate,
              canReport: post.canReport,
              isAuthor: post.isAuthor,
            }}
            allowAnnouncement={allowAnnouncement}
            redirectOnDelete={detail ? (post.group ? `/groups/${post.group.slug}` : "/feed") : undefined}
          />
        </div>
      </header>

      {showGroup && post.group ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Posted in{" "}
          <Link href={`/groups/${post.group.slug}`} className="font-medium text-foreground hover:underline">
            {post.group.icon ? `${post.group.icon} ` : ""}
            {post.group.name}
          </Link>
        </p>
      ) : null}

      <RichText text={post.content} className={cn("mt-3", !detail && "line-clamp-[12]")} />

      {link ? (
        <a
          href={post.linkUrl!}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate">
            <span className="font-medium">{link.host}</span>
            <span className="text-muted-foreground">{link.rest}</span>
          </span>
        </a>
      ) : null}

      {post.imageKeys.length ? (
        <div className="mt-3">
          <PostImages keys={post.imageKeys} />
        </div>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <ReactionBar
          key={`${post.reactions.total}-${post.reactions.mine ?? ""}`}
          postId={post.id}
          initial={post.reactions}
          disabled={post.removed}
        />
        {detail ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="size-4" aria-hidden />
            {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
          </span>
        ) : (
          <Link
            href={`${href}#comments`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-4" aria-hidden />
            {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
          </Link>
        )}
      </footer>
    </article>
  );
}
