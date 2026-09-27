import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Cake,
  CalendarDays,
  CheckCircle2,
  FolderGit2,
  Megaphone,
  MessagesSquare,
  Pin,
  ShieldAlert,
  UserCircle,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { countNewAnnouncements, getImportantBanner, listDashboardAnnouncements } from "@/services/announcements";
import { countUpcomingEvents, listUpcomingEvents } from "@/services/events";
import { getTodaysBirthdays, getUpcomingBirthdays } from "@/services/birthdays";
import { ensureReminders } from "@/services/reminders";
import { countNewOpportunities, listLatestOpportunities } from "@/services/opportunities";
import { listRecentProjects } from "@/services/projects";
import { getOwnCompletion } from "@/services/profiles";
import { communityActivity, countMembers, recentlyUpdatedProfiles } from "@/services/dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  POST_TYPE_LABELS,
  PROJECT_CATEGORY_LABELS,
} from "@/lib/labels";
import { formatDate, formatRelative, formatTime, formatWeekdayDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function Panel({
  title,
  icon: Icon,
  href,
  linkLabel = "View all",
  className,
  children,
}: {
  title: string;
  icon: typeof Megaphone;
  href?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-xs", className)} aria-labelledby={`panel-${title}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id={`panel-${title}`} className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-primary" aria-hidden /> {title}
        </h2>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  await ensureReminders(viewer);

  const [
    banner,
    announcements,
    newAnnouncements,
    events,
    upcomingEventCount,
    todaysBirthdays,
    upcomingBirthdays,
    opportunities,
    newOpportunities,
    projects,
    completion,
    members,
    recentProfiles,
    activity,
  ] = await Promise.all([
    getImportantBanner(),
    listDashboardAnnouncements(viewer, 4),
    countNewAnnouncements(7),
    listUpcomingEvents(viewer, 4),
    countUpcomingEvents(30),
    getTodaysBirthdays(viewer),
    getUpcomingBirthdays(viewer, 14),
    listLatestOpportunities(viewer, 4),
    countNewOpportunities(7),
    listRecentProjects(viewer, 4),
    getOwnCompletion(viewer.id),
    countMembers(),
    recentlyUpdatedProfiles(viewer, 6),
    communityActivity(5),
  ]);

  const firstName = viewer.fullName.split(" ")[0] ?? viewer.fullName;

  return (
    <div className="space-y-6">
      {sp.welcome ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <CheckCircle2 className="size-4 text-success" aria-hidden /> Your password is set. Welcome to the CSE 24 community!{" "}
          <Link href="/profile/edit" className="font-medium text-primary hover:underline">
            Complete your profile →
          </Link>
        </p>
      ) : null}
      {sp.denied ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="size-4" aria-hidden /> You don&apos;t have permission to open that page.
        </p>
      ) : null}

      {/* Hero */}
      <section className="bg-brand-gradient relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-md sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.25),transparent_45%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-white/80">{greeting()} · {formatWeekdayDate(new Date())}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {firstName} 👋</h1>
            <p className="mt-2 max-w-lg text-sm text-white/85">
              {todaysBirthdays.length
                ? `🎂 ${todaysBirthdays.length === 1 ? `${todaysBirthdays[0]!.name} has` : `${todaysBirthdays.length} batchmates have`} a birthday today.`
                : upcomingEventCount
                  ? `${upcomingEventCount} event${upcomingEventCount === 1 ? "" : "s"} coming up in the next 30 days.`
                  : "Here's what's happening in the batch."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/feed">Open feed</Link>
            </Button>
            <Button variant="outline" asChild className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/directory">Find batchmates</Link>
            </Button>
          </div>
        </div>
      </section>

      {banner ? (
        <Link
          href={`/announcements/${banner.id}`}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
            banner.category === "EMERGENCY" || banner.priority === "URGENT"
              ? "border-destructive/40 bg-destructive/10 hover:bg-destructive/15"
              : "border-warning/40 bg-warning/10 hover:bg-warning/15",
          )}
        >
          <AlertTriangle className={cn("size-5 shrink-0", banner.category === "EMERGENCY" || banner.priority === "URGENT" ? "text-destructive" : "text-warning")} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{ANNOUNCEMENT_CATEGORY_LABELS[banner.category]}:</span> {banner.title}
          </span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Batch members" value={members} icon={Users} href="/directory" />
        <StatCard label="Profile completion" value={`${completion}%`} icon={UserCircle} tone="green" href="/profile/edit">
          <Progress value={completion} className="mt-3" aria-label="Profile completion" />
        </StatCard>
        <StatCard label="Upcoming events" value={upcomingEventCount} hint="Next 30 days" icon={CalendarDays} tone="teal" href="/events" />
        <StatCard label="New announcements" value={newAnnouncements} hint="Last 7 days" icon={Megaphone} tone="amber" href="/announcements" />
        <StatCard label="New opportunities" value={newOpportunities} hint="Last 7 days" icon={Briefcase} tone="pink" href="/opportunities" />
        <StatCard label="Recent projects" value={projects.length} hint="Newest in the gallery" icon={FolderGit2} href="/projects" />
        <StatCard label="Upcoming birthdays" value={upcomingBirthdays.length} hint="Next 14 days" icon={Cake} tone="amber" href="/birthdays" />
        <StatCard label="Birthdays today" value={todaysBirthdays.length} icon={Cake} tone="pink" href="/birthdays" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Recent announcements" icon={Megaphone} href="/announcements">
            {announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements" className="py-8" />
            ) : (
              <ul className="divide-y">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <Link href={`/announcements/${a.id}`} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium group-hover:text-primary">
                          {a.pinned ? <Pin className="size-3.5 shrink-0 text-primary" aria-label="Pinned" /> : null}
                          <span className="line-clamp-1">{a.title}</span>
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{a.body}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={a.category === "EMERGENCY" || a.category === "IMPORTANT" ? "destructive" : "secondary"}>
                          {ANNOUNCEMENT_CATEGORY_LABELS[a.category]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatRelative(a.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Upcoming events" icon={CalendarDays} href="/events">
            {events.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming events" className="py-8" />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="flex gap-3 rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-accent/40">
                      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 py-1.5 text-primary">
                        <span className="text-[10px] font-semibold uppercase">
                          {new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Asia/Dhaka" }).format(e.startsAt)}
                        </span>
                        <span className="text-lg leading-none font-bold">
                          {new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Asia/Dhaka" }).format(e.startsAt)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {EVENT_TYPE_LABELS[e.type]} · {formatTime(e.startsAt)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {e.counts.going} going{e.viewerStatus ? ` · you: ${e.viewerStatus === "GOING" ? "going" : e.viewerStatus === "MAYBE" ? "maybe" : "not going"}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Latest opportunities" icon={Briefcase} href="/opportunities">
            {opportunities.length === 0 ? (
              <EmptyState icon={Briefcase} title="No open opportunities" className="py-8" />
            ) : (
              <ul className="divide-y">
                {opportunities.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/opportunities?q=${encodeURIComponent(o.title)}`} className="line-clamp-1 font-medium hover:text-primary">
                        {o.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {o.organization} · {OPPORTUNITY_TYPE_LABELS[o.type]}
                      </p>
                    </div>
                    {o.daysLeft !== null ? (
                      <Badge variant={o.urgent ? "destructive" : "outline"} className="shrink-0">
                        {o.daysLeft === 0 ? "Due today" : o.daysLeft === 1 ? "1 day left" : `${o.daysLeft} days left`}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        No deadline
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Community activity" icon={MessagesSquare} href="/feed" linkLabel="Open feed">
            {activity.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="The feed is quiet" description="Be the first to post something!" className="py-8" />
            ) : (
              <ul className="space-y-4">
                {activity.map((p) => (
                  <li key={p.id} className="flex gap-3">
                    <UserAvatar name={p.author.name} avatarKey={p.author.avatarKey} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <Link href={`/students/${p.author.roll}`} className="font-medium hover:underline">
                          {p.author.name}
                        </Link>{" "}
                        <span className="text-muted-foreground">
                          · {POST_TYPE_LABELS[p.type]} · {formatRelative(p.createdAt)}
                        </span>
                      </p>
                      <Link href={`/feed/${p.id}`} className="mt-0.5 line-clamp-2 text-sm text-muted-foreground hover:text-foreground">
                        {p.content}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p._count.reactions} reactions · {p._count.comments} comments
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Today's birthdays" icon={Cake} href="/birthdays">
            {todaysBirthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No birthdays today.</p>
            ) : (
              <ul className="space-y-3">
                {todaysBirthdays.map((b) => (
                  <li key={b.userId} className="flex items-center gap-3">
                    <UserAvatar name={b.name} avatarKey={b.avatarKey} size="sm" />
                    <Link href={`/students/${b.roll}`} className="flex-1 text-sm font-medium hover:underline">
                      {b.name} 🎂
                    </Link>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/birthdays">Wish</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {upcomingBirthdays.length ? (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Coming up</p>
                <ul className="space-y-2">
                  {upcomingBirthdays.slice(0, 4).map((b) => (
                    <li key={b.userId} className="flex items-center justify-between text-sm">
                      <Link href={`/students/${b.roll}`} className="hover:underline">
                        {b.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{b.daysAway === 1 ? "Tomorrow" : `in ${b.daysAway} days`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <Panel title="Recently updated profiles" icon={Users} href="/directory?sort=recent">
            {recentProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentProfiles.map((s) => (
                  <li key={s.userId}>
                    <Link href={`/students/${s.roll}`} className="flex items-center gap-3 rounded-lg hover:bg-muted/60">
                      <UserAvatar name={s.fullName} avatarKey={s.avatarKey} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.skills.slice(0, 3).join(" · ") || s.roll}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(s.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent projects" icon={FolderGit2} href="/projects">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ul className="space-y-3">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="block rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-accent/40">
                      <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {PROJECT_CATEGORY_LABELS[p.category]} · {p.likeCount} likes · {formatDate(p.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
