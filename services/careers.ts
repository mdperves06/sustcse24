import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { canSee, DEFAULT_PRIVACY, sharedWithBatch, type Viewer } from "@/lib/privacy";
import { activeUserWhere } from "@/lib/selects";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { EmploymentStatus } from "@/lib/generated/prisma/enums";

export const CAREER_PAGE_SIZE = 24;

const EMPLOYMENT = ["STUDENT", "EMPLOYED", "INTERN", "FREELANCER", "SEEKING", "HIGHER_STUDIES", "ENTREPRENEUR", "OTHER"] as const;

export const careerFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  industry: z.string().trim().max(100).optional().catch(undefined),
  company: z.string().trim().max(120).optional().catch(undefined),
  location: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(EMPLOYMENT).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type CareerFilters = z.infer<typeof careerFiltersSchema>;

export type CareerMember = {
  userId: string;
  roll: string;
  fullName: string;
  avatarKey: string | null;
  isVerified: boolean;
  employmentStatus: EmploymentStatus;
  organization: string | null;
  position: string | null;
  industry: string | null;
  /** Only when the member shares their location with the batch. */
  location: string | null;
  linkedinUrl: string | null;
};

/**
 * The Career Network only ever includes members who share career details with the
 * batch AND have something career-related to show.
 */
const careerBase: Prisma.UserWhereInput = {
  AND: [
    activeUserWhere,
    sharedWithBatch("careerVisibility"),
    {
      profile: {
        is: {
          OR: [
            { currentOrganization: { not: null } },
            { position: { not: null } },
            { employmentStatus: { not: "STUDENT" } },
          ],
        },
      },
    },
  ],
};

const memberSelect = {
  id: true,
  roll: true,
  privacy: { select: { locationVisibility: true, linkedinVisibility: true } },
  profile: {
    select: {
      fullName: true,
      avatarKey: true,
      isVerified: true,
      employmentStatus: true,
      currentOrganization: true,
      position: true,
      industry: true,
      location: true,
      linkedinUrl: true,
    },
  },
} satisfies Prisma.UserSelect;

type MemberRow = Prisma.UserGetPayload<{ select: typeof memberSelect }>;

function toMember(row: MemberRow, viewer: Viewer): CareerMember {
  const p = row.profile;
  const loc = canSee(row.privacy?.locationVisibility ?? DEFAULT_PRIVACY.locationVisibility, viewer, row.id);
  const li = canSee(row.privacy?.linkedinVisibility ?? DEFAULT_PRIVACY.linkedinVisibility, viewer, row.id);
  return {
    userId: row.id,
    roll: row.roll,
    fullName: p?.fullName ?? row.roll,
    avatarKey: p?.avatarKey ?? null,
    isVerified: p?.isVerified ?? false,
    employmentStatus: p?.employmentStatus ?? "STUDENT",
    organization: p?.currentOrganization ?? null,
    position: p?.position ?? null,
    industry: p?.industry ?? null,
    location: loc ? (p?.location ?? null) : null,
    linkedinUrl: li ? (p?.linkedinUrl ?? null) : null,
  };
}

export async function searchCareerNetwork(viewer: Viewer, input: CareerFilters | Record<string, unknown>) {
  const filters = careerFiltersSchema.parse(input);
  const and: Prisma.UserWhereInput[] = [careerBase];
  const profile = (where: Prisma.StudentProfileWhereInput): Prisma.UserWhereInput => ({ profile: { is: where } });

  if (filters.q) {
    and.push({
      OR: [
        { roll: { contains: filters.q, mode: "insensitive" } },
        profile({ fullName: { contains: filters.q, mode: "insensitive" } }),
        profile({ nickname: { contains: filters.q, mode: "insensitive" } }),
      ],
    });
  }
  if (filters.industry) and.push(profile({ industry: { contains: filters.industry, mode: "insensitive" } }));
  if (filters.company) and.push(profile({ currentOrganization: { contains: filters.company, mode: "insensitive" } }));
  if (filters.status) and.push(profile({ employmentStatus: filters.status }));
  if (filters.location) {
    // Location is separately private — only match members who share it.
    and.push(sharedWithBatch("locationVisibility"), profile({ location: { contains: filters.location, mode: "insensitive" } }));
  }

  const where: Prisma.UserWhereInput = { AND: and };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: memberSelect,
      orderBy: [{ profile: { fullName: "asc" } }],
      skip: (filters.page - 1) * CAREER_PAGE_SIZE,
      take: CAREER_PAGE_SIZE,
    }),
  ]);
  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / CAREER_PAGE_SIZE)),
    members: rows.map((r) => toMember(r, viewer)),
  };
}

/** Aggregates over members who share career info only (never over private data). */
export async function getCareerSummary() {
  const where: Prisma.StudentProfileWhereInput = { user: { is: careerBase } };
  const [total, byStatus, industries, companies] = await Promise.all([
    db.studentProfile.count({ where }),
    db.studentProfile.groupBy({ by: ["employmentStatus"], where, _count: { _all: true } }),
    db.studentProfile.groupBy({
      by: ["industry"],
      where: { AND: [where, { industry: { not: null } }] },
      _count: { _all: true },
      orderBy: { _count: { industry: "desc" } },
      take: 8,
    }),
    db.studentProfile.groupBy({
      by: ["currentOrganization"],
      where: { AND: [where, { currentOrganization: { not: null } }] },
      _count: { _all: true },
      orderBy: { _count: { currentOrganization: "desc" } },
      take: 8,
    }),
  ]);
  return {
    total,
    byStatus: byStatus
      .map((s) => ({ status: s.employmentStatus, count: s._count._all }))
      .sort((a, b) => b.count - a.count),
    topIndustries: industries.map((i) => ({ name: i.industry!, count: i._count._all })),
    topCompanies: companies.map((c) => ({ name: c.currentOrganization!, count: c._count._all })),
  };
}
