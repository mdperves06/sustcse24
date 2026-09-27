import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Code2, Layers, Lightbulb, Target, Users, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getSkillMap } from "@/services/skill-map";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SkillBars } from "@/components/skills/skill-bars";
import { cn } from "@/lib/utils";
import type { SkillCategory } from "@/lib/generated/prisma/enums";

export const metadata: Metadata = { title: "Skill Map" };

const CATEGORY_SECTIONS: { key: SkillCategory; title: string; icon: typeof Code2; bar: string }[] = [
  { key: "LANGUAGE", title: "Languages", icon: Code2, bar: "bg-chart-1" },
  { key: "FRAMEWORK", title: "Frameworks", icon: Layers, bar: "bg-chart-2" },
  { key: "TOOL", title: "Tools", icon: Wrench, bar: "bg-chart-3" },
  { key: "OTHER", title: "Other skills", icon: Target, bar: "bg-chart-4" },
];

export default async function SkillMapPage() {
  await requireUser();
  const { summary, byCategory, tracked, interests } = await getSkillMap();
  const trackedMax = Math.max(1, ...tracked.map((t) => t.count));
  const coverage = summary.activeMembers ? Math.round((summary.membersWithSkills / summary.activeMembers) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Skill Map"
        description="What CSE 24 knows, at a glance. Batch-level counts only — tap a skill to find members in the directory."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Distinct skills" value={summary.distinctSkills} icon={BarChart3} />
        <StatCard label="Members with skills" value={summary.membersWithSkills} icon={Users} tone="teal" hint={`${coverage}% of the batch`} />
        <StatCard
          label="Avg. skills / member"
          value={summary.membersWithSkills ? (summary.totalSkillEntries / summary.membersWithSkills).toFixed(1) : "0"}
          icon={Layers}
          tone="amber"
        />
        <StatCard label="Top skill" value={summary.topSkills[0]?.name ?? "—"} icon={Target} tone="pink" />
      </div>

      <section aria-labelledby="tracked-title" className="mb-6 rounded-2xl border bg-card p-5 shadow-xs">
        <h2 id="tracked-title" className="mb-4 font-semibold">
          Spotlight skills
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {tracked.map((t) => (
            <li key={t.name}>
              <Link
                href={`/directory?skill=${encodeURIComponent(t.name)}`}
                className={cn(
                  "flex h-full flex-col items-center justify-end gap-2 rounded-xl border p-3 text-center transition-colors hover:border-primary/40 hover:bg-muted/40",
                  t.count === 0 && "opacity-60",
                )}
              >
                <div className="flex h-20 w-6 items-end overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="bg-brand-gradient w-full rounded-full" style={{ height: `${Math.max(4, (t.count / trackedMax) * 100)}%` }} />
                </div>
                <span className="text-xl font-semibold tabular-nums">{t.count}</span>
                <span className="text-xs font-medium">{t.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-title" className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 id="top-title" className="mb-4 flex items-center gap-2 font-semibold">
            <BarChart3 className="size-4 text-primary" aria-hidden /> Top skills overall
          </h2>
          <SkillBars items={summary.topSkills} total={summary.membersWithSkills} label="Top skills overall" />
        </section>
        <section aria-labelledby="int-title" className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 id="int-title" className="mb-4 flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4 text-chart-3" aria-hidden /> Top interests
          </h2>
          <SkillBars items={interests} total={summary.activeMembers} barClass="bg-chart-3" linkParam="interest" label="Top interests" />
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {CATEGORY_SECTIONS.map((c) => (
          <section key={c.key} aria-labelledby={`cat-${c.key}`} className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 id={`cat-${c.key}`} className="mb-4 flex items-center gap-2 font-semibold">
              <c.icon className="size-4 text-muted-foreground" aria-hidden /> {c.title}
            </h2>
            <SkillBars items={byCategory[c.key]} total={summary.membersWithSkills} barClass={c.bar} label={c.title} />
          </section>
        ))}
      </div>
    </>
  );
}
