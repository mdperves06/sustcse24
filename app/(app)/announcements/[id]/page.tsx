import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Paperclip } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getAnnouncement } from "@/services/announcements";
import { NotFoundError } from "@/lib/errors";
import { fileUrl } from "@/lib/files";
import { formatDate, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RichText } from "@/components/shared/rich-text";
import { Button } from "@/components/ui/button";
import { AnnouncementBadges } from "@/components/announcements/announcement-badges";
import { AnnouncementAdminActions } from "@/components/announcements/announcement-admin-actions";
import { SEVERITY_CARD, severityOf } from "@/components/announcements/announcement-styles";
import type { Viewer } from "@/lib/privacy";

export const metadata: Metadata = { title: "Announcement" };

async function load(viewer: Viewer, id: string) {
  try {
    return await getAnnouncement(viewer, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export default async function AnnouncementPage({ params }: PageProps<"/announcements/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const a = await load(viewer, id);
  const canManage = can(viewer.role, "announcements.manage");
  const url = fileUrl(a.attachmentKey);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/announcements" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All announcements
      </Link>

      <article className={cn("rounded-2xl border bg-card p-5 shadow-xs sm:p-8", SEVERITY_CARD[severityOf(a.category, a.priority)])}>
        <AnnouncementBadges category={a.category} priority={a.priority} pinned={a.pinned} archived={a.archived} expired={a.expired} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{a.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link href={`/students/${encodeURIComponent(a.author.roll)}`} className="flex items-center gap-2 hover:text-foreground">
            <UserAvatar name={a.author.name} avatarKey={a.author.avatarKey} size="sm" />
            <span className="font-medium text-foreground">{a.author.name}</span>
          </Link>
          <span aria-hidden>·</span>
          <time dateTime={a.createdAt.toISOString()}>{formatDateTime(a.createdAt)}</time>
          {a.updatedAt.getTime() - a.createdAt.getTime() > 60_000 ? <span>(edited)</span> : null}
          {a.expiresAt ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {a.expired ? "Expired" : "Expires"} {formatDate(a.expiresAt)}
              </span>
            </>
          ) : null}
        </div>

        <RichText text={a.body} className="mt-6 text-base" />

        {url ? (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center">
            <Paperclip className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.attachmentName ?? "Attachment"}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener">
                  <ExternalLink aria-hidden /> Open
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={`${url}?download=1`}>
                  <Download aria-hidden /> Download
                </a>
              </Button>
            </div>
          </div>
        ) : null}

        {canManage ? (
          <div className="mt-6 border-t pt-4">
            <AnnouncementAdminActions id={a.id} pinned={a.pinned} archived={a.archived} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
