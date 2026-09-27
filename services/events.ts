import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan } from "@/lib/auth/permissions";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { activeUserWhere, authorSelect, toAuthor, type Author } from "@/lib/selects";
import { formatDateTime } from "@/lib/time";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { EventType, RsvpStatus } from "@/lib/generated/prisma/enums";
import { eventSchema, rsvpSchema, type EventFilters } from "@/lib/validation/events";
import { notifyBatch } from "@/services/notifications";

export const EVENTS_PAGE_SIZE = 12;

export type RsvpCounts = { going: number; maybe: number; notGoing: number };

export type EventSummary = {
  id: string;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date | null;
  location: string;
  organizer: string;
  coverKey: string | null;
  registrationDeadline: Date | null;
  counts: RsvpCounts;
  viewerStatus: RsvpStatus | null;
  rsvpOpen: boolean;
  isPast: boolean;
};

export type EventDetail = EventSummary & {
  description: string;
  createdAt: Date;
  createdBy: Author;
  going: Author[];
  goingTotal: number;
};

const summarySelect = {
  id: true,
  title: true,
  type: true,
  startsAt: true,
  endsAt: true,
  location: true,
  organizer: true,
  coverKey: true,
  registrationDeadline: true,
} satisfies Prisma.EventSelect;

type SummaryRow = Prisma.EventGetPayload<{ select: typeof summarySelect }>;

/** RSVPs close at the registration deadline, or once the event has started. */
export function isRsvpOpen(e: { startsAt: Date; registrationDeadline: Date | null }, now = new Date()): boolean {
  if (now >= e.startsAt) return false;
  if (e.registrationDeadline && now > e.registrationDeadline) return false;
  return true;
}

function isPast(e: { startsAt: Date; endsAt: Date | null }, now: Date) {
  return (e.endsAt ?? e.startsAt) < now;
}

/** Events that haven't finished yet (ongoing multi-hour/day events count as upcoming). */
const upcomingWhere = (now: Date): Prisma.EventWhereInput => ({
  deletedAt: null,
  OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }],
});

const pastWhere = (now: Date): Prisma.EventWhereInput => ({
  deletedAt: null,
  startsAt: { lt: now },
  OR: [{ endsAt: null }, { endsAt: { lt: now } }],
});

async function decorate(viewer: Viewer, rows: SummaryRow[], now = new Date()): Promise<EventSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [groups, mine] = await Promise.all([
    db.eventAttendee.groupBy({
      by: ["eventId", "status"],
      where: { eventId: { in: ids }, user: activeUserWhere },
      _count: { _all: true },
    }),
    db.eventAttendee.findMany({ where: { eventId: { in: ids }, userId: viewer.id }, select: { eventId: true, status: true } }),
  ]);
  const counts = new Map<string, RsvpCounts>();
  for (const g of groups) {
    const c = counts.get(g.eventId) ?? { going: 0, maybe: 0, notGoing: 0 };
    if (g.status === "GOING") c.going = g._count._all;
    else if (g.status === "MAYBE") c.maybe = g._count._all;
    else c.notGoing = g._count._all;
    counts.set(g.eventId, c);
  }
  const statusById = new Map(mine.map((m) => [m.eventId, m.status]));
  return rows.map((r) => ({
    ...r,
    counts: counts.get(r.id) ?? { going: 0, maybe: 0, notGoing: 0 },
    viewerStatus: statusById.get(r.id) ?? null,
    rsvpOpen: isRsvpOpen(r, now),
    isPast: isPast(r, now),
  }));
}

export async function listEvents(viewer: Viewer, filters: EventFilters) {
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    AND: [filters.tab === "past" ? pastWhere(now) : upcomingWhere(now), filters.type ? { type: filters.type } : {}],
  };
  const [total, rows] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      orderBy: { startsAt: filters.tab === "past" ? "desc" : "asc" },
      select: summarySelect,
      skip: (filters.page - 1) * EVENTS_PAGE_SIZE,
      take: EVENTS_PAGE_SIZE,
    }),
  ]);
  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / EVENTS_PAGE_SIZE)),
    events: await decorate(viewer, rows, now),
  };
}

export async function getEvent(viewer: Viewer, id: string): Promise<EventDetail> {
  const row = await db.event.findFirst({
    where: { id, deletedAt: null },
    select: { ...summarySelect, description: true, createdAt: true, createdBy: { select: authorSelect } },
  });
  if (!row) throw new NotFoundError("This event doesn't exist or was removed.");
  const goingWhere = { eventId: id, status: "GOING" as const, user: activeUserWhere };
  const [[summary], going, goingTotal] = await Promise.all([
    decorate(viewer, [row]),
    db.eventAttendee.findMany({
      where: goingWhere,
      orderBy: { createdAt: "asc" },
      take: 60,
      select: { user: { select: authorSelect } },
    }),
    db.eventAttendee.count({ where: goingWhere }),
  ]);
  return {
    ...summary!,
    description: row.description,
    createdAt: row.createdAt,
    createdBy: toAuthor(row.createdBy),
    going: going.map((g) => toAuthor(g.user)),
    goingTotal,
  };
}

/** For edit forms (events.manage). */
export async function getEventForEdit(actor: Viewer, id: string) {
  assertCan(actor, "events.manage");
  const row = await db.event.findFirst({ where: { id, deletedAt: null } });
  if (!row) throw new NotFoundError("This event doesn't exist or was removed.");
  return row;
}

// ───────────── Dashboard exports ─────────────

export async function listUpcomingEvents(viewer: Viewer, take = 4): Promise<EventSummary[]> {
  const now = new Date();
  const rows = await db.event.findMany({
    where: upcomingWhere(now),
    orderBy: { startsAt: "asc" },
    select: summarySelect,
    take,
  });
  return decorate(viewer, rows, now);
}

/** Events starting within the next `days` days. */
export async function countUpcomingEvents(days = 30): Promise<number> {
  const now = new Date();
  return db.event.count({
    where: { deletedAt: null, startsAt: { gte: now, lte: new Date(now.getTime() + days * 86_400_000) } },
  });
}

// ───────────── Mutations ─────────────

export async function createEvent(actor: Viewer, input: unknown, cover: File | null = null) {
  assertCan(actor, "events.manage");
  const data = eventSchema.parse(input);
  const saved = cover ? await saveUpload(cover, "cover", "cover") : null;
  const row = await db.event.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      location: data.location,
      organizer: data.organizer,
      registrationDeadline: data.registrationDeadline,
      coverKey: saved?.key ?? null,
      createdById: actor.id,
    },
    select: { id: true, title: true, startsAt: true, location: true },
  });
  await audit({ actorId: actor.id, action: "event.create", entityType: "Event", entityId: row.id, metadata: { title: row.title } });
  await notifyBatch({
    type: "EVENT_REMINDER",
    title: `New event: ${row.title}`,
    body: `${formatDateTime(row.startsAt)} · ${row.location}`,
    link: `/events/${row.id}`,
    actorId: actor.id,
    dedupeKey: `event-new:${row.id}`,
  });
  return row;
}

export async function updateEvent(actor: Viewer, id: string, input: unknown, cover: File | null = null) {
  assertCan(actor, "events.manage");
  const existing = await getEventForEdit(actor, id);
  const data = eventSchema.parse(input);
  const saved = cover ? await saveUpload(cover, "cover", "cover") : null;
  await db.event.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      location: data.location,
      organizer: data.organizer,
      registrationDeadline: data.registrationDeadline,
      ...(saved ? { coverKey: saved.key } : data.removeCover ? { coverKey: null } : {}),
    },
  });
  if ((saved || data.removeCover) && existing.coverKey) await deleteUpload(existing.coverKey);
  await audit({ actorId: actor.id, action: "event.update", entityType: "Event", entityId: id, metadata: { title: data.title } });
}

export async function deleteEvent(actor: Viewer, id: string) {
  assertCan(actor, "events.manage");
  const existing = await getEventForEdit(actor, id);
  await db.event.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, action: "event.delete", entityType: "Event", entityId: id, metadata: { title: existing.title } });
}

/**
 * Sets the viewer's RSVP. The composite primary key (eventId, userId) makes duplicate
 * RSVPs impossible; choosing the current status again is a no-op.
 */
export async function setRsvp(actor: Viewer, eventId: string, input: unknown): Promise<RsvpStatus> {
  const { status } = rsvpSchema.parse(input);
  await enforceRateLimit(`rsvp:${actor.id}`, 30, 60, "You're changing RSVPs too quickly. Try again in a minute.");
  const event = await db.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { id: true, startsAt: true, registrationDeadline: true },
  });
  if (!event) throw new NotFoundError("This event doesn't exist or was removed.");
  if (!isRsvpOpen(event)) throw new ValidationError("RSVPs are closed for this event.");
  await db.eventAttendee.upsert({
    where: { eventId_userId: { eventId, userId: actor.id } },
    update: { status },
    create: { eventId, userId: actor.id, status },
  });
  return status;
}
