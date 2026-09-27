import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { canSee, DEFAULT_PRIVACY, sharedWithBatch, type Viewer } from "@/lib/privacy";
import { skillSlug } from "@/lib/skills";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { EmploymentStatus } from "@/lib/generated/prisma/enums";

export const DIRECTORY_PAGE_SIZE = 24;

export const directoryFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  skill: z.string().trim().max(60).optional().catch(undefined),
  location: z.string().trim().max(100).optional().catch(undefined),
  company: z.string().trim().max(120).optional().catch(undefined),
  interest: z.string().trim().max(60).optional().catch(undefined),
  status: z
    .enum(["STUDENT", "EMPLOYED", "INTERN", "FREELANCER", "SEEKING", "HIGHER_STUDIES", "ENTREPRENEUR", "OTHER"])
    .optional()
    .catch(undefined),
  sort: z.enum(["name", "roll", "recent"]).default("roll").catch("roll"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type DirectoryFilters = z.infer<typeof directoryFiltersSchema>;

export type StudentCard = {
  userId: string;
  roll: string;
  fullName: string;
  nickname: string | null;
  avatarKey: string | null;
  bio: string | null;
  skills: string[];
  position: string | null;
  organization: string | null;
  employmentStatus: EmploymentStatus;
  isVerified: boolean;
};

const cardSelect = {
  id: true,
  roll: true,
  privacy: { select: { careerVisibility: true } },
  profile: {
    select: {
      fullName: true,
      nickname: true,
      avatarKey: true,
      bio: true,
      position: true,
      currentOrganization: true,
      employmentStatus: true,
      isVerified: true,
    },
  },
  skills: { select: { skill: { select: { name: true } } }, take: 6 },
} satisfies Prisma.UserSelect;

export function toStudentCard(
  row: Prisma.UserGetPayload<{ select: typeof cardSelect }>,
  viewer: Viewer,
): StudentCard {
  const career = canSee(row.privacy?.careerVisibility ?? DEFAULT_PRIVACY.careerVisibility, viewer, row.id);
  return {
    userId: row.id,
    roll: row.roll,
    fullName: row.profile?.fullName ?? row.roll,
    nickname: row.profile?.nickname ?? null,
    avatarKey: row.profile?.avatarKey ?? null,
    bio: row.profile?.bio ?? null,
    skills: row.skills.map((s) => s.skill.name),
    position: career ? (row.profile?.position ?? null) : null,
    organization: career ? (row.profile?.currentOrganization ?? null) : null,
    employmentStatus: row.profile?.employmentStatus ?? "STUDENT",
    isVerified: row.profile?.isVerified ?? false,
  };
}

export const studentCardSelect = cardSelect;

/**
 * Batch directory search. Filters on privacy-controlled fields (location, company,
 * career status) only match students who share that field — otherwise the filter
 * itself would leak private data.
 */
export async function searchDirectory(viewer: Viewer, filters: DirectoryFilters) {
  const and: Prisma.UserWhereInput[] = [{ deletedAt: null, status: "ACTIVE", profile: { isNot: null } }];

  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { roll: { contains: q, mode: "insensitive" } },
        { profile: { is: { fullName: { contains: q, mode: "insensitive" } } } },
        { profile: { is: { nickname: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (filters.skill) {
    and.push({ skills: { some: { skill: { slug: skillSlug(filters.skill) } } } });
  }
  if (filters.interest) {
    const needle = filters.interest;
    and.push({
      OR: [
        { profile: { is: { interests: { has: needle } } } },
        { profile: { is: { academicInterests: { has: needle } } } },
        { profile: { is: { careerInterests: { has: needle } } } },
      ],
    });
  }
  if (filters.location) {
    and.push(sharedWithBatch("locationVisibility"), {
      profile: { is: { location: { contains: filters.location, mode: "insensitive" } } },
    });
  }
  if (filters.company) {
    and.push(sharedWithBatch("careerVisibility"), {
      profile: { is: { currentOrganization: { contains: filters.company, mode: "insensitive" } } },
    });
  }
  if (filters.status) {
    and.push(sharedWithBatch("careerVisibility"), { profile: { is: { employmentStatus: filters.status } } });
  }

  const where: Prisma.UserWhereInput = { AND: and };
  const orderBy: Prisma.UserOrderByWithRelationInput =
    filters.sort === "name"
      ? { profile: { fullName: "asc" } }
      : filters.sort === "recent"
        ? { updatedAt: "desc" }
        : { roll: "asc" };

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy,
      select: cardSelect,
      skip: (filters.page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
    students: rows.map((r) => toStudentCard(r, viewer)),
  };
}

/** Options for the directory filter dropdowns (only from shared data). */
export async function getDirectoryFacets() {
  const [skills, interests] = await Promise.all([
    db.skill.findMany({
      where: { profiles: { some: { user: { deletedAt: null, status: "ACTIVE" } } } },
      select: { name: true, slug: true, _count: { select: { profiles: true } } },
      orderBy: { profiles: { _count: "desc" } },
      take: 60,
    }),
    db.$queryRaw<{ tag: string; n: bigint }[]>`
      SELECT tag, COUNT(*) AS n FROM (
        SELECT unnest(sp.interests) AS tag FROM student_profiles sp
        JOIN users u ON u.id = sp."userId" WHERE u."deletedAt" IS NULL AND u.status = 'ACTIVE'
      ) t GROUP BY tag ORDER BY n DESC LIMIT 40`,
  ]);
  return {
    skills: skills.map((s) => ({ name: s.name, slug: s.slug, count: s._count.profiles })),
    interests: interests.map((i) => i.tag),
  };
}
