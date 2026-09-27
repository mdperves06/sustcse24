import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, History } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/errors";
import { getStudentDetail } from "@/services/admin-users";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AccountBadges, CompletionMeter, RoleBadge } from "@/components/admin/badges";
import { EditStudentForm } from "@/components/admin/edit-student-form";
import { StudentAccountActions } from "@/components/admin/student-account-actions";
import { RestrictionForm } from "@/components/admin/restriction-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appDayStart, appToday, formatDate, formatDateTime, formatRelative, toLocalInputValue } from "@/lib/time";

export const metadata: Metadata = { title: "Student · Admin" };

function tomorrowInput() {
  const t = appToday();
  return toLocalInputValue(new Date(appDayStart(t.year, t.month, t.day).getTime() + 86_400_000), "date");
}

export default async function AdminStudentPage({ params }: PageProps<"/admin/students/[id]">) {
  const viewer = await requirePermission("students.manage");
  const { id } = await params;
  const student = await getStudentDetail(viewer, id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });
  const isSelf = student.id === viewer.id;

  const facts: [string, React.ReactNode][] = [
    ["Created", formatDate(student.createdAt)],
    ["Last login", student.lastLoginAt ? formatDateTime(student.lastLoginAt) : "Never"],
    ["Last active", student.lastActiveAt ? formatRelative(student.lastActiveAt) : "Never"],
    ["Active sessions", student.counts.sessions],
    ["Failed sign-ins", student.failedLoginAttempts],
    ["Posts · comments", `${student.counts.posts} · ${student.counts.comments}`],
    ["Skills listed", student.counts.skills],
    ["Profile completion", <CompletionMeter key="c" value={student.completion} />],
  ];

  return (
    <>
      <Link href="/admin/students" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All students
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={student.fullName} avatarKey={student.avatarKey} size="lg" />
            <span className="min-w-0">
              <span className="block truncate">{student.fullName}</span>
              <span className="block font-mono text-sm font-normal text-muted-foreground">{student.roll}</span>
            </span>
          </span>
        }
        actions={
          !student.deleted && student.status === "ACTIVE" ? (
            <Button asChild variant="outline">
              <Link href={`/students/${encodeURIComponent(student.roll)}`}>
                <ExternalLink aria-hidden /> View profile
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-1.5">
        <RoleBadge role={student.role} />
        <AccountBadges
          status={student.status}
          deleted={student.deleted}
          locked={student.locked}
          mustChangePassword={student.mustChangePassword}
          restricted={Boolean(student.restrictedUntil)}
        />
        {student.isVerified ? <Badge variant="secondary">Verified</Badge> : null}
        {student.isDemo ? <Badge variant="outline">Demo account</Badge> : null}
        {isSelf ? <Badge variant="outline">You</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Identity details used across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <EditStudentForm
                id={student.id}
                roll={student.roll}
                fullName={student.fullName}
                studentId={student.studentId}
                email={student.email}
                disabled={student.deleted}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Every change here is recorded in the audit log.</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentAccountActions
                id={student.id}
                name={student.fullName}
                role={student.role}
                status={student.status}
                deleted={student.deleted}
                locked={student.locked}
                isVerified={student.isVerified}
                hasProfile={student.hasProfile}
                isSelf={isSelf}
                isLastActiveAdmin={student.isLastActiveAdmin}
                canAssignRoles={can(viewer.role, "roles.assign")}
              />
            </CardContent>
          </Card>

          {!student.deleted ? (
            <Card>
              <CardHeader>
                <CardTitle>Posting restriction</CardTitle>
                <CardDescription>Temporarily stop this account from posting and commenting.</CardDescription>
              </CardHeader>
              <CardContent>
                <RestrictionForm
                  id={student.id}
                  restrictedUntil={student.restrictedUntil?.toISOString() ?? null}
                  restrictedUntilLabel={student.restrictedUntil ? formatDateTime(student.restrictedUntil) : null}
                  reason={student.restrictionReason}
                  minDate={tomorrowInput()}
                  disabled={isSelf}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y text-sm">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
                {student.deletedAt ? (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">Deleted</dt>
                    <dd className="text-right font-medium">{formatDateTime(student.deletedAt)}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4 text-primary" aria-hidden /> Recent admin actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.recentAudit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admin actions recorded for this account.</p>
              ) : (
                <ul className="space-y-2.5 text-sm">
                  {student.recentAudit.map((a) => (
                    <li key={a.id}>
                      <p className="font-mono text-xs">{a.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.actor?.roll ?? "system"} · <time dateTime={a.createdAt.toISOString()}>{formatDateTime(a.createdAt)}</time>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {can(viewer.role, "audit.view") ? (
                <Link
                  href={`/admin/audit?entity=User&entityId=${encodeURIComponent(student.id)}`}
                  className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Open audit log
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
