import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Award,
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Flag,
  FolderGit2,
  Gauge,
  KeyRound,
  Megaphone,
  MessagesSquare,
  UserCheck,
  Users,
  UsersRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { requirePermission, requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getAdminAnalytics, getAdminStats } from "@/services/admin-stats";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EMPLOYMENT_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Admin overview" };

const QUICK_LINKS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/announcements", label: "Announcements", description: "Post, pin and archive notices", icon: Megaphone },
  { href: "/events", label: "Events", description: "Create and manage batch events", icon: CalendarDays },
  { href: "/resources", label: "Resources", description: "Curate academic material", icon: BookOpen },
  { href: "/opportunities", label: "Opportunities", description: "Jobs, internships, hackathons", icon: Briefcase },
  { href: "/groups", label: "Groups", description: "Interest groups and managers", icon: UsersRound },
  { href: "/polls", label: "Polls", description: "Create and close polls", icon: Vote },
  { href: "/calendar", label: "Calendar", description: "Exams, deadlines, batch dates", icon: CalendarRange },
  { href: "/achievements/review", label: "Achievement reviews", description: "Verify submitted achievements", icon: Award },
];

export default async function AdminOverviewPage() {
  const viewer = await requireUser();
  if (!can(viewer.role, "stats.view")) redirect("/admin/moderation");
  await requirePermission("stats.view");

  const [stats, analytics] = await Promise.all([getAdminStats(viewer), getAdminAnalytics(viewer)]);
  const totals = analytics.daily.reduce(
    (acc, d) => ({ posts: acc.posts + d.posts, comments: acc.comments + d.comments, sessions: acc.sessions + d.sessions }),
    { posts: 0, comments: 0, sessions: 0 },
  );
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Batch-wide health at a glance. All figures are aggregates — no individual data is shown here."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/students">
              <Users aria-hidden /> Manage students
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">
          Statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Students" value={stats.totalAccounts} hint={`${stats.activeAccounts} active accounts`} icon={Users} href="/admin/students" />
          <StatCard
            label="Active (30 days)"
            value={stats.active30}
            hint={`${pct(stats.active30, stats.activeAccounts)}% of active accounts`}
            icon={Activity}
            tone="teal"
          />
          <StatCard label="Avg. completion" value={`${stats.avgCompletion}%`} hint="Profile completeness" icon={Gauge} tone="green" />
          <StatCard
            label="Verified profiles"
            value={stats.verified}
            hint={`${pct(stats.verified, stats.activeAccounts)}% of active accounts`}
            icon={UserCheck}
            href="/admin/students?flag=unverified"
          />
          <StatCard
            label="Pending reports"
            value={stats.pendingReports}
            hint={stats.pendingReports ? "Waiting for review" : "Queue is clear"}
            icon={Flag}
            tone={stats.pendingReports ? "pink" : "green"}
            href="/admin/moderation"
          />
          <StatCard
            label="Default password"
            value={stats.defaultPassword}
            hint="Active accounts that haven't changed it"
            icon={KeyRound}
            tone="amber"
            href="/admin/students?flag=default_password"
          />
          <StatCard label="Posts" value={stats.posts} hint="Visible feed posts" icon={MessagesSquare} tone="teal" href="/feed" />
          <StatCard label="Events" value={stats.events} icon={CalendarDays} href="/events" />
          <StatCard label="Opportunities" value={stats.opportunities} icon={Briefcase} tone="amber" href="/opportunities" />
          <StatCard label="Projects" value={stats.projects} icon={FolderGit2} tone="pink" href="/projects" />
          <StatCard
            label="Achievements"
            value={stats.achievementsVerified}
            hint={`Verified · ${stats.achievementsPending} pending review`}
            icon={Award}
            tone="green"
            href="/achievements/review"
          />
          <StatCard
            label="Active accounts"
            value={stats.activeAccounts}
            hint={`${stats.totalAccounts - stats.activeAccounts} disabled`}
            icon={CheckCircle2}
            tone="teal"
            href="/admin/students?status=active"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Community activity</CardTitle>
            <CardDescription>
              Last 14 days · {totals.posts} posts, {totals.comments} comments, {totals.sessions} sign-ins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart
              data={analytics.daily}
              caption="Posts, comments and sign-ins per day over the last 14 days"
              series={[
                { key: "posts", label: "Posts", tone: "bg-primary" },
                { key: "comments", label: "Comments", tone: "bg-chart-2" },
                { key: "sessions", label: "Sign-ins", tone: "bg-chart-3" },
              ]}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Sign-ins count sessions still on record; sessions that were signed out or expired are purged.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active users</CardTitle>
            <CardDescription>Accounts seen recently (of {analytics.activeUsers.total} active)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              tone="bg-chart-2"
              items={[
                { label: "Last 24 hours", value: analytics.activeUsers.day },
                { label: "Last 7 days", value: analytics.activeUsers.week },
                { label: "Last 30 days", value: stats.active30 },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile completion</CardTitle>
            <CardDescription>Distribution across active accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList tone="bg-chart-5" items={stats.completionBuckets.map((b) => ({ label: b.label, value: b.count }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top skills</CardTitle>
            <CardDescription>By number of members listing the skill</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={analytics.topSkills.map((s) => ({ label: s.name, value: s.count }))} emptyText="No skills listed yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Career status</CardTitle>
            <CardDescription>
              {analytics.careerShared} members sharing career details
              {analytics.careerHidden ? ` · ${analytics.careerHidden} keep it private` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              tone="bg-chart-4"
              items={analytics.career.map((c) => ({ label: EMPLOYMENT_LABELS[c.status], value: c.count }))}
              emptyText="No shared career data yet."
            />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="content-heading" className="mt-8">
        <h2 id="content-heading" className="mb-1 text-lg font-semibold">
          Content management
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Admins see manage controls directly on each of these pages.</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="flex h-full items-start gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <l.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{l.label}</span>
                  <span className="block text-xs text-muted-foreground">{l.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
