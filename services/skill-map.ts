import "server-only";
import { db } from "@/lib/db";
import { activeUserWhere } from "@/lib/selects";
import { skillSlug } from "@/lib/skills";
import type { SkillCategory } from "@/lib/generated/prisma/enums";

/**
 * Batch-level skill statistics. Only aggregate counts are ever returned —
 * never which members have a skill (the directory handles that, privacy-safely).
 */

export type SkillStat = { name: string; slug: string; category: SkillCategory; count: number };

/** Skills from the spec that are always shown, even at 0. */
export const TRACKED_SKILLS = ["Python", "Java", "C++", "JavaScript", "React", "Next.js", "AI/ML", "Cyber Security", "Data Science"];

async function allSkillCounts(): Promise<SkillStat[]> {
  const rows = await db.skill.findMany({
    select: {
      name: true,
      slug: true,
      category: true,
      _count: { select: { profiles: { where: { user: activeUserWhere } } } },
    },
  });
  return rows
    .map((r) => ({ name: r.name, slug: r.slug, category: r.category, count: r._count.profiles }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Landing page stat: how many distinct skills active members list. */
export async function countDistinctSkills(): Promise<number> {
  return db.skill.count({ where: { profiles: { some: { user: activeUserWhere } } } });
}

export type SkillMapSummary = {
  /** Active members with at least one skill. */
  membersWithSkills: number;
  activeMembers: number;
  distinctSkills: number;
  /** Total member–skill pairs. */
  totalSkillEntries: number;
  topSkills: SkillStat[];
};

/** Compact summary for the dashboard / landing page. */
export async function getSkillMapSummary(take = 10): Promise<SkillMapSummary> {
  const [skills, membersWithSkills, activeMembers] = await Promise.all([
    allSkillCounts(),
    db.user.count({ where: { ...activeUserWhere, skills: { some: {} } } }),
    db.user.count({ where: { ...activeUserWhere, profile: { isNot: null } } }),
  ]);
  return {
    membersWithSkills,
    activeMembers,
    distinctSkills: skills.length,
    totalSkillEntries: skills.reduce((sum, s) => sum + s.count, 0),
    topSkills: skills.slice(0, take),
  };
}

/** Full data for the /skills page. */
export async function getSkillMap() {
  const [skills, summary, interests] = await Promise.all([
    allSkillCounts(),
    getSkillMapSummary(15),
    db.$queryRaw<{ tag: string; n: bigint }[]>`
      SELECT min(tag) AS tag, COUNT(DISTINCT "userId") AS n FROM (
        SELECT sp."userId", unnest(sp.interests || sp."academicInterests") AS tag
        FROM student_profiles sp JOIN users u ON u.id = sp."userId"
        WHERE u."deletedAt" IS NULL AND u.status = 'ACTIVE'
      ) t GROUP BY lower(tag) ORDER BY n DESC, tag ASC LIMIT 15`,
  ]);

  const byCategory: Record<SkillCategory, SkillStat[]> = { LANGUAGE: [], FRAMEWORK: [], TOOL: [], OTHER: [] };
  for (const s of skills) if (byCategory[s.category].length < 10) byCategory[s.category].push(s);

  const bySlug = new Map(skills.map((s) => [s.slug, s]));
  const tracked = TRACKED_SKILLS.map((name) => {
    const hit = bySlug.get(skillSlug(name));
    return { name: hit?.name ?? name, count: hit?.count ?? 0 };
  });

  return {
    summary,
    byCategory,
    tracked,
    interests: interests.map((i) => ({ name: i.tag, count: Number(i.n) })),
  };
}
