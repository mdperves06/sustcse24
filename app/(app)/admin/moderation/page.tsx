import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Ban, Flag, FlagTriangleRight, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listFlaggedContent, listReports, type ReportView } from "@/services/moderation";
import { listRestrictedUsers } from "@/services/admin-users";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LiftRestrictionButton, ReportActions, RestrictAuthorDialog } from "@/components/admin/report-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatRelative } from "@/lib/time";
import type { ReportStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Moderation · Admin" };

const TABS: { status: ReportStatus; label: string }[] = [
  { status: "PENDING", label: "Pending" },
  { status: "RESOLVED", label: "Resolved" },
  { status: "DISMISSED", label: "Dismissed" },
];

function ReportCard({ report, canRestrict }: { report: ReportView; canRestrict: boolean }) {
  const t = report.target;
  const kindLabel = t?.kind === "COMMENT" ? "Comment" : "Post";
  const contentGone = !t || t.removed || t.deleted;

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5" aria-labelledby={`report-${report.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`report-${report.id}`} className="flex flex-wrap items-center gap-2 font-medium">
            <Flag className="size-4 text-destructive" aria-hidden />
            {report.reason}
            <Badge variant="outline">{kindLabel}</Badge>
            {t?.removed ? <Badge variant="destructive">Removed</Badge> : null}
            {t?.deleted ? <Badge variant="secondary">Deleted by author</Badge> : null}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reported by {report.reporter.name} ({report.reporter.roll}) ·{" "}
            <time dateTime={report.createdAt.toISOString()} title={formatDateTime(report.createdAt)}>
              {formatRelative(report.createdAt)}
            </time>
          </p>
        </div>
        {t ? (
          <Link
            href={`/feed/${t.postId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open post <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </header>

      {report.details ? (
        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium">Details: </span>
          {report.details}
        </p>
      ) : null}

      {t ? (
        <div className="mt-3 rounded-xl border p-3">
          <div className="mb-2 flex items-center gap-2">
            <UserAvatar name={t.author.name} avatarKey={t.author.avatarKey} size="xs" />
            <span className="text-sm font-medium">{t.author.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{t.author.roll}</span>
            {t.authorRestrictedUntil ? (
              <Badge variant="outline" className="border-chart-4/30 bg-chart-4/10 text-chart-4">
                Restricted until {formatDate(t.authorRestrictedUntil)}
              </Badge>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
          </div>
          <RichText text={t.content} className="max-h-64 overflow-y-auto" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">The reported content no longer exists.</p>
      )}

      {report.status === "PENDING" ? (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4">
          <ReportActions reportId={report.id} kind={t?.kind ?? "POST"} contentGone={contentGone} />
          {canRestrict && t && !t.authorRestrictedUntil && t.author.role === "STUDENT" ? (
            <div>
              <RestrictAuthorDialog reportId={report.id} authorName={t.author.name} />
            </div>
          ) : null}
        </div>
      ) : (
        <footer className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          {report.status === "RESOLVED" ? "Resolved" : "Dismissed"}
          {report.reviewedBy ? ` by ${report.reviewedBy.name}` : ""}
          {report.reviewedAt ? ` · ${formatDateTime(report.reviewedAt)}` : ""}
          {report.resolutionNote ? <span className="mt-1 block text-foreground">Note: {report.resolutionNote}</span> : null}
        </footer>
      )}
    </article>
  );
}

export default async function ModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  const viewer = await requirePermission("reports.review");
  const sp = await searchParams;
  const canRestrict = can(viewer.role, "users.restrict");
  const [result, flagged, restricted] = await Promise.all([
    listReports(viewer, sp),
    listFlaggedContent(viewer),
    canRestrict ? listRestrictedUsers(viewer) : Promise.resolve([]),
  ]);
  const status = result.filters.status;

  return (
    <>
      <PageHeader title="Moderation" description="Review reported posts and comments, and manage posting restrictions." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Reports">
          <nav aria-label="Report status" className="mb-4 inline-flex rounded-lg border p-0.5">
            {TABS.map((tab) => {
              const active = tab.status === status;
              return (
                <Link
                  key={tab.status}
                  href={tab.status === "PENDING" ? "/admin/moderation" : `/admin/moderation?status=${tab.status}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{result.counts[tab.status]}</span>
                </Link>
              );
            })}
          </nav>

          {result.reports.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title={status === "PENDING" ? "No pending reports" : `No ${status.toLowerCase()} reports`}
              description={status === "PENDING" ? "The queue is clear. New reports from batch members appear here." : undefined}
            />
          ) : (
            <ul className="space-y-4">
              {result.reports.map((r) => (
                <li key={r.id}>
                  <ReportCard report={r} canRestrict={canRestrict} />
                </li>
              ))}
            </ul>
          )}
          <Pagination page={result.page} pageCount={result.pageCount} basePath="/admin/moderation" searchParams={sp} />
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlagTriangleRight className="size-4 text-destructive" aria-hidden /> Flagged content
              </CardTitle>
              <CardDescription>Posts and comments with 2+ pending reports.</CardDescription>
            </CardHeader>
            <CardContent>
              {flagged.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing has multiple pending reports.</p>
              ) : (
                <ul className="divide-y">
                  {flagged.map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="py-2.5">
                      <Link href={`/feed/${item.postId}`} className="group block rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                        <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            {item.kind === "POST" ? "Post" : "Comment"} by {item.author.name}
                          </span>
                          <Badge variant="destructive">{item.reports} reports</Badge>
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm group-hover:underline">{item.excerpt}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {canRestrict ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="size-4 text-chart-4" aria-hidden /> Restricted accounts
                </CardTitle>
                <CardDescription>Accounts that currently can&apos;t post or comment.</CardDescription>
              </CardHeader>
              <CardContent>
                {restricted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active posting restrictions.</p>
                ) : (
                  <ul className="divide-y">
                    {restricted.map((u) => (
                      <li key={u.id} className="flex items-center gap-3 py-2.5">
                        <UserAvatar name={u.name} avatarKey={u.avatarKey} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground" title={u.reason ?? undefined}>
                            Until {formatDate(u.until)}
                            {u.reason ? ` · ${u.reason}` : ""}
                          </p>
                        </div>
                        <LiftRestrictionButton userId={u.id} name={u.name} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </>
  );
}
