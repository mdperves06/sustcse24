import type { Metadata } from "next";
import Link from "next/link";
import { Award, BadgeCheck, ClipboardCheck, Trophy, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import {
  countPendingAchievements,
  getHallOfFameStats,
  listOwnAchievements,
  listVerifiedAchievements,
} from "@/services/achievements";
import { achievementFiltersSchema } from "@/lib/validation/achievements";
import { EmptyState } from "@/components/shared/empty-state";
import { HallOfFameCard } from "@/components/achievements/achievement-card";
import { MySubmissions } from "@/components/achievements/my-submissions";
import { SubmitAchievementDialog } from "@/components/achievements/submit-dialog";
import { ACHIEVEMENT_CATEGORY_META } from "@/components/achievements/category-meta";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENT_CATEGORY_LABELS, options } from "@/lib/labels";
import { toLocalInputValue } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hall of Fame" };

export default async function AchievementsPage({ searchParams }: PageProps<"/achievements">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = achievementFiltersSchema.parse(sp);
  const canVerify = can(viewer.role, "achievements.verify");
  const [items, stats, mine, pending] = await Promise.all([
    listVerifiedAchievements(filters),
    getHallOfFameStats(),
    listOwnAchievements(viewer),
    canVerify ? countPendingAchievements(viewer) : Promise.resolve(0),
  ]);
  const topCategories = options(ACHIEVEMENT_CATEGORY_LABELS)
    .map((o) => ({ ...o, count: stats.byCategory[o.value] ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="bg-brand-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-10">
        <Trophy className="absolute -right-6 -bottom-8 size-48 rotate-12 opacity-15 sm:size-64" aria-hidden />
        <div className="relative max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur">
            <BadgeCheck className="size-3.5" aria-hidden /> Verified by moderators
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">CSE 24 Hall of Fame</h1>
          <p className="text-sm text-white/85 sm:text-base">
            Hackathon wins, research papers, scholarships, startups — celebrating everything our batch has achieved.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <SubmitAchievementDialog today={toLocalInputValue(new Date(), "date")} />
            {canVerify ? (
              <Button variant="secondary" asChild>
                <Link href="/achievements/review">
                  <ClipboardCheck aria-hidden /> Review queue{pending ? ` (${pending})` : ""}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <dl className="relative mt-8 grid max-w-xl grid-cols-3 gap-3">
          {[
            { label: "Verified achievements", value: stats.total, icon: Award },
            { label: "Members honoured", value: stats.members, icon: Users },
            { label: "Categories", value: topCategories.length, icon: Trophy },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/10 p-3 backdrop-blur sm:p-4">
              <dt className="text-[11px] font-medium text-white/75 sm:text-xs">{s.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Category filter with counts */}
      <nav aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/achievements"
          aria-current={!filters.category ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            !filters.category ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          All · {stats.total}
        </Link>
        {options(ACHIEVEMENT_CATEGORY_LABELS).map((o) => {
          const Icon = ACHIEVEMENT_CATEGORY_META[o.value].icon;
          const on = filters.category === o.value;
          return (
            <Link
              key={o.value}
              href={`/achievements?category=${o.value}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {o.label}
              <span className="text-xs opacity-70 tabular-nums">{stats.byCategory[o.value] ?? 0}</span>
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={filters.category ? "No verified achievements in this category yet" : "The Hall of Fame is waiting"}
          description="Submit your achievement — once a moderator verifies it, it shows up here for the whole batch."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => (
            <li key={a.id}>
              <HallOfFameCard achievement={a} />
            </li>
          ))}
        </ul>
      )}

      <section id="mine" aria-labelledby="mine-title" className="scroll-mt-20 space-y-3">
        <div>
          <h2 id="mine-title" className="text-lg font-semibold">
            My submissions
          </h2>
          <p className="text-sm text-muted-foreground">Track the review status of what you&apos;ve submitted.</p>
        </div>
        {mine.length === 0 ? (
          <EmptyState icon={Award} title="No submissions yet" description="Won something, published a paper or earned a certification? Submit it!" />
        ) : (
          <MySubmissions items={mine} />
        )}
      </section>
    </div>
  );
}
