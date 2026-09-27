import "server-only";
import { db } from "@/lib/db";
import { assertCan, can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import { getSetting } from "@/lib/settings";
import { daysUntil } from "@/lib/time";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { OpportunityType } from "@/lib/generated/prisma/enums";
import {
  opportunityFiltersSchema,
  opportunitySchema,
  type OpportunityFilters,
} from "@/lib/validation/opportunities";

export const OPPORTUNITY_PAGE_SIZE = 12;
/** Deadlines this close (in days) get urgent styling. */
export const URGENT_DAYS = 3;

export type OpportunityItem = {
  id: string;
  title: string;
  organization: string;
  description: string;
  type: OpportunityType;
  location: string | null;
  deadline: Date | null;
  applyUrl: string | null;
  createdAt: Date;
  postedBy: Author;
  saved: boolean;
  saveCount: number;
  /** Computed at read time: the deadline has passed. Never stored. */
  expired: boolean;
  /** Whole Dhaka calendar days until the deadline (null when there is none). */
  daysLeft: number | null;
  urgent: boolean;
  canEdit: boolean;
};

function selectFor(viewerId: string) {
  return {
    id: true,
    title: true,
    organization: true,
    description: true,
    type: true,
    location: true,
    deadline: true,
    applyUrl: true,
    createdAt: true,
    postedById: true,
    postedBy: { select: authorSelect },
    bookmarks: { where: { userId: viewerId }, select: { userId: true } },
    _count: { select: { bookmarks: true } },
  } satisfies Prisma.OpportunitySelect;
}

type OpportunityRow = Prisma.OpportunityGetPayload<{ select: ReturnType<typeof selectFor> }>;

function toItem(row: OpportunityRow, viewer: Viewer, now = new Date()): OpportunityItem {
  const expired = row.deadline ? row.deadline.getTime() < now.getTime() : false;
  const daysLeft = row.deadline ? daysUntil(row.deadline, now) : null;
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    description: row.description,
    type: row.type,
    location: row.location,
    deadline: row.deadline,
    applyUrl: row.applyUrl,
    createdAt: row.createdAt,
    postedBy: toAuthor(row.postedBy),
    saved: row.bookmarks.length > 0,
    saveCount: row._count.bookmarks,
    expired,
    daysLeft,
    urgent: !expired && daysLeft !== null && daysLeft <= URGENT_DAYS,
    canEdit: row.postedById === viewer.id || can(viewer.role, "opportunities.manage"),
  };
}

/** Not expired: no deadline, or the deadline is still ahead. */
const openWhere = (now: Date): Prisma.OpportunityWhereInput => ({
  OR: [{ deadline: null }, { deadline: { gte: now } }],
});

export async function canPostOpportunities(viewer: Viewer): Promise<boolean> {
  if (can(viewer.role, "opportunities.manage")) return true;
  return getSetting("studentOpportunityPosts");
}

export async function listOpportunities(viewer: Viewer, input: OpportunityFilters | Record<string, unknown>) {
  const filters = opportunityFiltersSchema.parse(input);
  const now = new Date();
  const and: Prisma.OpportunityWhereInput[] = [{ deletedAt: null }];
  if (!filters.expired) and.push(openWhere(now));
  if (filters.type) and.push({ type: filters.type });
  if (filters.saved) and.push({ bookmarks: { some: { userId: viewer.id } } });
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { organization: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.OpportunityWhereInput = { AND: and };
  const orderBy: Prisma.OpportunityOrderByWithRelationInput[] =
    filters.sort === "deadline"
      ? [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    db.opportunity.count({ where }),
    db.opportunity.findMany({
      where,
      orderBy,
      select: selectFor(viewer.id),
      skip: (filters.page - 1) * OPPORTUNITY_PAGE_SIZE,
      take: OPPORTUNITY_PAGE_SIZE,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / OPPORTUNITY_PAGE_SIZE)),
    opportunities: rows.map((r) => toItem(r, viewer, now)),
  };
}

/** Dashboard widget: newest opportunities that are still open. */
export async function listLatestOpportunities(viewer: Viewer, take = 4): Promise<OpportunityItem[]> {
  const now = new Date();
  const rows = await db.opportunity.findMany({
    where: { AND: [{ deletedAt: null }, openWhere(now)] },
    orderBy: { createdAt: "desc" },
    take,
    select: selectFor(viewer.id),
  });
  return rows.map((r) => toItem(r, viewer, now));
}

/** Dashboard stat: open opportunities posted in the last `sinceDays` days. */
export async function countNewOpportunities(sinceDays = 7): Promise<number> {
  const now = new Date();
  return db.opportunity.count({
    where: {
      AND: [{ deletedAt: null }, { createdAt: { gte: new Date(now.getTime() - sinceDays * 86_400_000) } }, openWhere(now)],
    },
  });
}

export async function getOpportunityCounts(viewer: Viewer) {
  const now = new Date();
  const [open, saved, closingSoon] = await Promise.all([
    db.opportunity.count({ where: { AND: [{ deletedAt: null }, openWhere(now)] } }),
    db.opportunity.count({
      where: { AND: [{ deletedAt: null }, openWhere(now), { bookmarks: { some: { userId: viewer.id } } }] },
    }),
    db.opportunity.count({
      where: {
        deletedAt: null,
        deadline: { gte: now, lte: new Date(now.getTime() + (URGENT_DAYS + 1) * 86_400_000) },
      },
    }),
  ]);
  return { open, saved, closingSoon };
}

export async function getOpportunity(viewer: Viewer, id: string): Promise<OpportunityItem> {
  const row = await db.opportunity.findFirst({ where: { id, deletedAt: null }, select: selectFor(viewer.id) });
  if (!row) throw new NotFoundError("That opportunity no longer exists.");
  return toItem(row, viewer);
}

export async function createOpportunity(actor: Viewer, input: unknown) {
  if (!(await canPostOpportunities(actor))) {
    throw new ForbiddenError("Posting opportunities is currently limited to admins.");
  }
  const data = opportunitySchema.parse(input);
  await enforceRateLimit(`opportunity:create:${actor.id}`, 10, 3600, "You've posted a lot of opportunities — try again later.");
  return db.opportunity.create({ data: { ...data, postedById: actor.id }, select: { id: true } });
}

async function loadEditable(actor: Viewer, id: string) {
  const row = await db.opportunity.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, postedById: true, title: true },
  });
  if (!row) throw new NotFoundError("That opportunity no longer exists.");
  const isOwner = row.postedById === actor.id;
  if (!isOwner) assertCan(actor, "opportunities.manage");
  return { row, isOwner };
}

export async function updateOpportunity(actor: Viewer, id: string, input: unknown) {
  const { isOwner } = await loadEditable(actor, id);
  const data = opportunitySchema.parse(input);
  await db.opportunity.update({ where: { id }, data });
  if (!isOwner) {
    await audit({ actorId: actor.id, action: "opportunity.update", entityType: "Opportunity", entityId: id });
  }
}

export async function deleteOpportunity(actor: Viewer, id: string) {
  const { row, isOwner } = await loadEditable(actor, id);
  await db.opportunity.update({ where: { id }, data: { deletedAt: new Date() } });
  if (!isOwner) {
    await audit({
      actorId: actor.id,
      action: "opportunity.delete",
      entityType: "Opportunity",
      entityId: id,
      metadata: { title: row.title },
    });
  }
}

/** Saves or un-saves an opportunity for the viewer. Idempotent. */
export async function setOpportunityBookmark(viewer: Viewer, id: string, saved: boolean) {
  const exists = await db.opportunity.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!exists) throw new NotFoundError("That opportunity no longer exists.");
  if (saved) {
    await db.opportunityBookmark.createMany({ data: [{ userId: viewer.id, opportunityId: id }], skipDuplicates: true });
  } else {
    await db.opportunityBookmark.deleteMany({ where: { userId: viewer.id, opportunityId: id } });
  }
  return { saved };
}
