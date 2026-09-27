import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, ExternalLink, History } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { listPendingAchievements, listRecentlyReviewed } from "@/services/achievements";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ReviewActions, RevokeButton } from "@/components/achievements/review-actions";
import { StatusBadge } from "@/components/achievements/my-submissions";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENT_CATEGORY_LABELS } from "@/lib/labels";
import { formatDate, formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Review achievements" };

export default async function ReviewAchievementsPage() {
  const viewer = await requirePermission("achievements.verify");
  const [pending, reviewed] = await Promise.all([listPendingAchievements(viewer), listRecentlyReviewed(viewer)]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/achievements" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Hall of Fame
        </Link>
        <PageHeader
          title="Achievement review"
          description={`${pending.length} submission${pending.length === 1 ? "" : "s"} waiting. Check the proof link before verifying — only verified achievements get the badge.`}
        />
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="All caught up" description="No achievements are waiting for review." />
      ) : (
        <ul className="space-y-4">
          {pending.map((a) => (
            <li key={a.id} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <Link href={`/students/${encodeURIComponent(a.owner.roll)}`} className="flex items-center gap-2 hover:underline">
                    <UserAvatar name={a.owner.name} avatarKey={a.owner.avatarKey} size="sm" />
                    <span className="text-sm font-medium">{a.owner.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{a.owner.roll}</span>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{ACHIEVEMENT_CATEGORY_LABELS[a.category]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.achievedOn ? `Achieved ${formatDate(a.achievedOn)} · ` : ""}submitted {formatRelative(a.createdAt)}
                    </span>
                  </div>
                  <h2 className="font-semibold">{a.title}</h2>
                  {a.description ? <RichText text={a.description} className="text-muted-foreground" /> : null}
                  {a.link ? (
                    <a href={a.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Open proof link <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <p className="text-xs text-warning">No proof link provided.</p>
                  )}
                </div>
                <ReviewActions id={a.id} title={a.title} canReview={a.owner.id !== viewer.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="recent-title" className="space-y-3">
        <h2 id="recent-title" className="flex items-center gap-2 text-lg font-semibold">
          <History className="size-4" aria-hidden /> Recently reviewed
        </h2>
        {reviewed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing reviewed yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card shadow-xs">
            {reviewed.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.status} />
                    <span className="truncate font-medium">{a.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.owner.name} · {ACHIEVEMENT_CATEGORY_LABELS[a.category]}
                    {a.verifiedBy ? ` · by ${a.verifiedBy.name}` : ""}
                    {a.verifiedAt ? ` ${formatRelative(a.verifiedAt)}` : ""}
                    {a.status === "REJECTED" && a.rejectionReason ? ` · “${a.rejectionReason}”` : ""}
                  </p>
                </div>
                {a.status !== "PENDING" ? <RevokeButton id={a.id} title={a.title} status={a.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
