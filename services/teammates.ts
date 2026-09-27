import "server-only";
import { db } from "@/lib/db";
import { assertCan, can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { canSee, DEFAULT_PRIVACY, type PrivacyFlags, type Viewer } from "@/lib/privacy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { activeUserWhere, authorSelect, toAuthor, type Author } from "@/lib/selects";
import { skillSlug } from "@/lib/skills";
import { daysUntil } from "@/lib/time";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ContactPreference, TeammateRequestStatus } from "@/lib/generated/prisma/enums";
import { studentCardSelect, toStudentCard, type StudentCard } from "@/services/directory";
import {
  teammateFiltersSchema,
  teammateRequestSchema,
  type TeammateFilters,
} from "@/lib/validation/teammates";

export type TeammateContact =
  | { kind: "profile" }
  | { kind: "email" | "phone"; value: string }
  | { kind: "link"; value: string; label: string }
  /** The author prefers this channel but keeps it private. */
  | { kind: "hidden" };

export type TeammateRequestItem = {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  /** Required skills the viewer has on their profile. */
  matchedSkills: string[];
  teammatesNeeded: number;
  deadline: Date | null;
  daysLeft: number | null;
  deadlinePassed: boolean;
  contactPreference: ContactPreference;
  contact: TeammateContact;
  status: TeammateRequestStatus;
  createdAt: Date;
  author: Author;
  isOwner: boolean;
  canModerate: boolean;
};

const requestSelect = {
  id: true,
  title: true,
  description: true,
  requiredSkills: true,
  teammatesNeeded: true,
  deadline: true,
  contactPreference: true,
  status: true,
  createdAt: true,
  authorId: true,
  author: {
    select: {
      ...authorSelect,
      email: true,
      privacy: {
        select: { emailVisibility: true, phoneVisibility: true, facebookVisibility: true, linkedinVisibility: true },
      },
      profile: { select: { fullName: true, avatarKey: true, phone: true, facebookUrl: true, linkedinUrl: true } },
    },
  },
} satisfies Prisma.TeammateRequestSelect;

type RequestRow = Prisma.TeammateRequestGetPayload<{ select: typeof requestSelect }>;

/** Only reveals a contact detail the author shares with the batch (canSee). */
function contactFor(row: RequestRow, viewer: Viewer): TeammateContact {
  const a = row.author;
  const privacy = { ...DEFAULT_PRIVACY, ...(a.privacy ?? {}) } satisfies PrivacyFlags;
  const see = (field: keyof PrivacyFlags) => canSee(privacy[field], viewer, a.id);
  switch (row.contactPreference) {
    case "IN_APP":
      return { kind: "profile" };
    case "EMAIL":
      return see("emailVisibility") && a.email ? { kind: "email", value: a.email } : { kind: "hidden" };
    case "PHONE":
      return see("phoneVisibility") && a.profile?.phone ? { kind: "phone", value: a.profile.phone } : { kind: "hidden" };
    case "FACEBOOK":
      return see("facebookVisibility") && a.profile?.facebookUrl
        ? { kind: "link", value: a.profile.facebookUrl, label: "Facebook" }
        : { kind: "hidden" };
    case "LINKEDIN":
      return see("linkedinVisibility") && a.profile?.linkedinUrl
        ? { kind: "link", value: a.profile.linkedinUrl, label: "LinkedIn" }
        : { kind: "hidden" };
  }
}

function toItem(row: RequestRow, viewer: Viewer, viewerSkills: Set<string>, canModerate: boolean): TeammateRequestItem {
  const now = new Date();
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requiredSkills: row.requiredSkills,
    matchedSkills: row.requiredSkills.filter((s) => viewerSkills.has(skillSlug(s))),
    teammatesNeeded: row.teammatesNeeded,
    deadline: row.deadline,
    daysLeft: row.deadline ? daysUntil(row.deadline, now) : null,
    deadlinePassed: row.deadline ? row.deadline.getTime() < now.getTime() : false,
    contactPreference: row.contactPreference,
    contact: contactFor(row, viewer),
    status: row.status,
    createdAt: row.createdAt,
    author: toAuthor(row.author),
    isOwner: row.authorId === viewer.id,
    canModerate,
  };
}

/** Slugs of the viewer's own profile skills (for "N of your skills match"). */
async function viewerSkillSlugs(viewer: Viewer) {
  const rows = await db.profileSkill.findMany({ where: { userId: viewer.id }, select: { skill: { select: { slug: true } } } });
  return new Set(rows.map((r) => r.skill.slug));
}

export async function listTeammateRequests(viewer: Viewer, input: TeammateFilters | Record<string, unknown>) {
  const filters = teammateFiltersSchema.parse(input);
  const and: Prisma.TeammateRequestWhereInput[] = [{ deletedAt: null, author: activeUserWhere }];
  if (!filters.closed) and.push({ status: "OPEN" });
  if (filters.mine) and.push({ authorId: viewer.id });
  if (filters.skills.length) and.push({ requiredSkills: { hasEvery: filters.skills } });
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { requiredSkills: { has: q.toLowerCase() } },
      ],
    });
  }
  const [rows, mySkills] = await Promise.all([
    db.teammateRequest.findMany({
      where: { AND: and },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60,
      select: requestSelect,
    }),
    viewerSkillSlugs(viewer),
  ]);
  const canModerate = can(viewer.role, "content.moderate");
  return rows.map((r) => toItem(r, viewer, mySkills, canModerate));
}

/** Popular skills across open requests (for quick filter chips). */
export async function listPopularRequestSkills(take = 14) {
  const rows = await db.$queryRaw<{ skill: string; n: bigint }[]>`
    SELECT skill, COUNT(*) AS n FROM (
      SELECT unnest("requiredSkills") AS skill FROM teammate_requests
      WHERE "deletedAt" IS NULL AND status = 'OPEN'
    ) s GROUP BY skill ORDER BY n DESC, skill ASC LIMIT ${take}`;
  return rows.map((r) => ({ skill: r.skill, count: Number(r.n) }));
}

/**
 * "Find students interested in AI + React": active members whose profile skills
 * cover ALL requested skills (matched by canonical slug). Skills aren't private.
 */
export async function findMatchingStudents(
  viewer: Viewer,
  skills: string[],
  take = 12,
): Promise<{ total: number; students: StudentCard[] }> {
  const slugs = [...new Set(skills.map(skillSlug).filter(Boolean))];
  if (slugs.length === 0) return { total: 0, students: [] };
  const where: Prisma.UserWhereInput = {
    AND: [
      { ...activeUserWhere, profile: { isNot: null }, id: { not: viewer.id } },
      ...slugs.map((slug) => ({ skills: { some: { skill: { slug } } } })),
    ],
  };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, select: studentCardSelect, orderBy: { roll: "asc" }, take }),
  ]);
  return { total, students: rows.map((r) => toStudentCard(r, viewer)) };
}

export async function createTeammateRequest(actor: Viewer, input: unknown) {
  const data = teammateRequestSchema.parse(input);
  await enforceRateLimit(`teammate:create:${actor.id}`, 5, 3600, "You've posted several requests recently — try again later.");
  return db.teammateRequest.create({ data: { ...data, authorId: actor.id }, select: { id: true } });
}

async function loadOwned(actor: Viewer, id: string, allowModerator: boolean) {
  const row = await db.teammateRequest.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, authorId: true, title: true },
  });
  if (!row) throw new NotFoundError("That request no longer exists.");
  const isOwner = row.authorId === actor.id;
  if (!isOwner) {
    if (!allowModerator) throw new NotFoundError("That request no longer exists.");
    assertCan(actor, "content.moderate");
  }
  return { row, isOwner };
}

/** Only the author closes/reopens their request. */
export async function setTeammateRequestStatus(actor: Viewer, id: string, status: TeammateRequestStatus) {
  const { row } = await loadOwned(actor, id, false);
  await db.teammateRequest.update({ where: { id: row.id }, data: { status } });
}

/** Author deletes; moderators may remove abusive posts (audited). */
export async function deleteTeammateRequest(actor: Viewer, id: string) {
  const { row, isOwner } = await loadOwned(actor, id, true);
  await db.teammateRequest.update({ where: { id }, data: { deletedAt: new Date() } });
  if (!isOwner) {
    await audit({
      actorId: actor.id,
      action: "teammate_request.delete",
      entityType: "TeammateRequest",
      entityId: id,
      metadata: { title: row.title },
    });
  }
}
