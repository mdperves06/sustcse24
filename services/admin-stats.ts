import "server-only";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/auth/permissions";
import { activeUserWhere } from "@/lib/selects";
import { sharedWithBatch, type Viewer } from "@/lib/privacy";
import { appDayStart, appToday } from "@/lib/time";
import { computeCompletion } from "@/services/profiles";
import type { EmploymentStatus } from "@/lib/generated/prisma/enums";

const DAY = 86_400_000;

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

/** Headline numbers for the admin overview. Aggregates only — no individual data. */
export async function getAdminStats(actor: Viewer) {
  assertCan(actor, "stats.view");
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);

  const [
    totalAccounts,
    activeAccounts,
    active30,
    verified,
    pendingReports,
    posts,
    events,
    opportunities,
    projects,
    achievements,
    defaultPassword,
    completionRows,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: activeUserWhere }),
    db.user.count({ where: { ...activeUserWhere, lastActiveAt: { gte: since30 } } }),
    db.user.count({ where: { ...activeUserWhere, profile: { is: { isVerified: true } } } }),
    db.report.count({ where: { status: "PENDING" } }),
    db.post.count({ where: { deletedAt: null, removedAt: null } }),
    db.event.count({ where: { deletedAt: null } }),
    db.opportunity.count({ where: { deletedAt: null } }),
    db.project.count({ where: { deletedAt: null } }),
    db.achievement.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    db.user.count({ where: { ...activeUserWhere, mustChangePassword: true } }),
    db.user.findMany({
      where: activeUserWhere,
      select: {
        email: true,
        _count: { select: { skills: true } },
        profile: {
          select: {
            avatarKey: true,
            bio: true,
            location: true,
            dateOfBirth: true,
            phone: true,
            bloodGroup: true,
            interests: true,
            githubUrl: true,
            linkedinUrl: true,
            currentOrganization: true,
            cvKey: true,
            nickname: true,
          },
        },
      },
    }),
  ]);

  const completions = completionRows.map((u) => computeCompletion(u.profile, u.email, u._count.skills));
  const avgCompletion = completions.length ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length) : 0;
  const buckets = [
    { label: "0–25%", count: 0 },
    { label: "25–50%", count: 0 },
    { label: "50–75%", count: 0 },
    { label: "75–100%", count: 0 },
  ];
  for (const c of completions) buckets[c >= 75 ? 3 : c >= 50 ? 2 : c >= 25 ? 1 : 0]!.count += 1;

  const achievementCount = (s: "PENDING" | "VERIFIED") => achievements.find((a) => a.status === s)?._count._all ?? 0;

  return {
    totalAccounts,
    activeAccounts,
    active30,
    verified,
    pendingReports,
    posts,
    events,
    opportunities,
    projects,
    achievementsPending: achievementCount("PENDING"),
    achievementsVerified: achievementCount("VERIFIED"),
    defaultPassword,
    avgCompletion,
    completionBuckets: buckets,
  };
}

export type DailyPoint = { day: string; label: string; posts: number; comments: number; sessions: number };

function lastDays(n: number) {
  const t = appToday();
  const todayStart = appDayStart(t.year, t.month, t.day).getTime();
  const days: { key: string; label: string }[] = [];
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
  for (let i = n - 1; i >= 0; i--) {
    // Shift back into "Dhaka wall clock as UTC" to read the calendar date.
    const d = new Date(todayStart - i * DAY + 6 * 3600_000);
    days.push({ key: d.toISOString().slice(0, 10), label: fmt.format(d) });
  }
  return { since: new Date(todayStart - (n - 1) * DAY), days };
}

type DayCount = { day: string; n: number };

/** Analytics for the overview charts (aggregate counts only). */
export async function getAdminAnalytics(actor: Viewer) {
  assertCan(actor, "stats.view");
  const { since, days } = lastDays(14);
  const now = Date.now();

  const [postDays, commentDays, sessionDays, skills, career, activeTotal, active1, active7] = await Promise.all([
    db.$queryRaw<DayCount[]>`
      SELECT to_char(("createdAt" + interval '6 hours')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM posts WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL GROUP BY 1`,
    db.$queryRaw<DayCount[]>`
      SELECT to_char(("createdAt" + interval '6 hours')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM comments WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL GROUP BY 1`,
    db.$queryRaw<DayCount[]>`
      SELECT to_char(("createdAt" + interval '6 hours')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM sessions WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.$queryRaw<{ name: string; n: number }[]>`
      SELECT s.name, COUNT(*)::int AS n
      FROM profile_skills ps
      JOIN skills s ON s.id = ps."skillId"
      JOIN users u ON u.id = ps."userId"
      WHERE u."deletedAt" IS NULL AND u.status = 'ACTIVE'
      GROUP BY s.id, s.name ORDER BY n DESC, s.name ASC LIMIT 10`,
    // Career data respects privacy: only students who share career details are counted.
    db.studentProfile.groupBy({
      by: ["employmentStatus"],
      where: { user: { is: { AND: [activeUserWhere, sharedWithBatch("careerVisibility")] } } },
      _count: { _all: true },
    }),
    db.user.count({ where: activeUserWhere }),
    db.user.count({ where: { ...activeUserWhere, lastActiveAt: { gte: new Date(now - DAY) } } }),
    db.user.count({ where: { ...activeUserWhere, lastActiveAt: { gte: new Date(now - 7 * DAY) } } }),
  ]);

  const toMap = (rows: DayCount[]) => new Map(rows.map((r) => [r.day, Number(r.n)]));
  const pm = toMap(postDays);
  const cm = toMap(commentDays);
  const sm = toMap(sessionDays);
  const daily: DailyPoint[] = days.map((d) => ({
    day: d.key,
    label: d.label,
    posts: pm.get(d.key) ?? 0,
    comments: cm.get(d.key) ?? 0,
    sessions: sm.get(d.key) ?? 0,
  }));

  const careerRows = career
    .map((c) => ({ status: c.employmentStatus as EmploymentStatus, count: c._count._all }))
    .sort((a, b) => b.count - a.count);
  const careerShared = careerRows.reduce((a, b) => a + b.count, 0);

  return {
    daily,
    activeUsers: { day: active1, week: active7, total: activeTotal },
    topSkills: skills.map((s) => ({ name: s.name, count: Number(s.n) })),
    career: careerRows,
    careerShared,
    careerHidden: Math.max(0, activeTotal - careerShared),
  };
}
