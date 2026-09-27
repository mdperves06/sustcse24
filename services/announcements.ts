import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/errors";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AnnouncementCategory, Priority } from "@/lib/generated/prisma/enums";
import {
  announcementSchema,
  type AnnouncementFilters,
} from "@/lib/validation/announcements";
import { notifyBatch } from "@/services/notifications";

export const ANNOUNCEMENTS_PAGE_SIZE = 10;

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: Priority;
  pinned: boolean;
  archived: boolean;
  expired: boolean;
  expiresAt: Date | null;
  attachmentKey: string | null;
  attachmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: Author;
};

const announcementSelect = {
  id: true,
  title: true,
  body: true,
  category: true,
  priority: true,
  pinned: true,
  archived: true,
  expiresAt: true,
  attachmentKey: true,
  attachmentName: true,
  createdAt: true,
  updatedAt: true,
  author: { select: authorSelect },
} satisfies Prisma.AnnouncementSelect;

type AnnouncementRow = Prisma.AnnouncementGetPayload<{ select: typeof announcementSelect }>;

function toView(row: AnnouncementRow, now = new Date()): AnnouncementView {
  return {
    ...row,
    expired: row.expiresAt !== null && row.expiresAt <= now,
    author: toAuthor(row.author),
  };
}

/** Visible in the "Active" view: not deleted, not archived, not expired. */
function activeWhere(now: Date): Prisma.AnnouncementWhereInput {
  return { deletedAt: null, archived: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

function archivedWhere(now: Date): Prisma.AnnouncementWhereInput {
  return { deletedAt: null, OR: [{ archived: true }, { expiresAt: { lte: now } }] };
}

const listOrder: Prisma.AnnouncementOrderByWithRelationInput[] = [{ pinned: "desc" }, { createdAt: "desc" }];

export async function listAnnouncements(_viewer: Viewer, filters: AnnouncementFilters) {
  const now = new Date();
  const and: Prisma.AnnouncementWhereInput[] = [filters.view === "archived" ? archivedWhere(now) : activeWhere(now)];
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { body: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.category) and.push({ category: filters.category });
  const where: Prisma.AnnouncementWhereInput = { AND: and };

  const [total, rows] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.findMany({
      where,
      orderBy: filters.view === "archived" ? [{ createdAt: "desc" }] : listOrder,
      select: announcementSelect,
      skip: (filters.page - 1) * ANNOUNCEMENTS_PAGE_SIZE,
      take: ANNOUNCEMENTS_PAGE_SIZE,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PAGE_SIZE)),
    items: rows.map((r) => toView(r, now)),
  };
}

export async function getAnnouncement(_viewer: Viewer, id: string): Promise<AnnouncementView> {
  const row = await db.announcement.findFirst({ where: { id, deletedAt: null }, select: announcementSelect });
  if (!row) throw new NotFoundError("This announcement doesn't exist or was removed.");
  return toView(row);
}

// ───────────── Dashboard exports ─────────────

/** Active, non-expired announcements (pinned first) for the dashboard. */
export async function listDashboardAnnouncements(viewer: Viewer, take = 5): Promise<AnnouncementView[]> {
  const now = new Date();
  const rows = await db.announcement.findMany({
    where: activeWhere(now),
    orderBy: listOrder,
    select: announcementSelect,
    take,
  });
  return rows.map((r) => toView(r, now));
}

/** Number of active announcements published in the last `sinceDays` days. */
export async function countNewAnnouncements(sinceDays = 7): Promise<number> {
  const now = new Date();
  return db.announcement.count({
    where: { AND: [activeWhere(now), { createdAt: { gte: new Date(now.getTime() - sinceDays * 86_400_000) } }] },
  });
}

/** The most recent active pinned announcement that is important/emergency or high/urgent priority. */
export async function getImportantBanner(): Promise<{
  id: string;
  title: string;
  category: AnnouncementCategory;
  priority: Priority;
} | null> {
  const now = new Date();
  return db.announcement.findFirst({
    where: {
      AND: [
        activeWhere(now),
        { pinned: true },
        { OR: [{ category: { in: ["IMPORTANT", "EMERGENCY"] } }, { priority: { in: ["HIGH", "URGENT"] } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, category: true, priority: true },
  });
}

// ───────────── Mutations (announcements.manage) ─────────────

function excerpt(text: string, max = 180) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export async function createAnnouncement(actor: Viewer, input: unknown, file: File | null) {
  assertCan(actor, "announcements.manage");
  const data = announcementSchema.parse(input);
  const saved = file ? await saveUpload(file, "attachment", "attachment") : null;

  const row = await db.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      category: data.category,
      priority: data.priority,
      pinned: data.pinned,
      expiresAt: data.expiresAt,
      authorId: actor.id,
      attachmentKey: saved?.key ?? null,
      attachmentName: saved?.fileName ?? null,
    },
    select: { id: true, title: true, body: true, category: true, priority: true },
  });

  await audit({
    actorId: actor.id,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: row.id,
    metadata: { title: row.title, category: row.category, priority: row.priority },
  });

  const urgent = row.category === "EMERGENCY" || row.priority === "URGENT";
  await notifyBatch({
    type: "ANNOUNCEMENT",
    title: `${urgent ? "🚨" : "📢"} ${row.title}`,
    body: excerpt(row.body),
    link: `/announcements/${row.id}`,
    actorId: actor.id,
    dedupeKey: `announcement:${row.id}`,
  });

  return row;
}

async function findManageable(id: string) {
  const row = await db.announcement.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true, attachmentKey: true, pinned: true, archived: true },
  });
  if (!row) throw new NotFoundError("This announcement doesn't exist or was removed.");
  return row;
}

export async function updateAnnouncement(actor: Viewer, id: string, input: unknown, file: File | null) {
  assertCan(actor, "announcements.manage");
  const existing = await findManageable(id);
  const data = announcementSchema.parse(input);
  const saved = file ? await saveUpload(file, "attachment", "attachment") : null;

  const attachment: Prisma.AnnouncementUpdateInput = saved
    ? { attachmentKey: saved.key, attachmentName: saved.fileName }
    : data.removeAttachment
      ? { attachmentKey: null, attachmentName: null }
      : {};

  await db.announcement.update({
    where: { id },
    data: {
      title: data.title,
      body: data.body,
      category: data.category,
      priority: data.priority,
      pinned: data.pinned,
      expiresAt: data.expiresAt,
      ...attachment,
    },
  });
  if ((saved || data.removeAttachment) && existing.attachmentKey) await deleteUpload(existing.attachmentKey);

  await audit({
    actorId: actor.id,
    action: "announcement.update",
    entityType: "Announcement",
    entityId: id,
    metadata: { title: data.title },
  });
}

export async function setAnnouncementPinned(actor: Viewer, id: string, pinned: boolean) {
  assertCan(actor, "announcements.manage");
  await findManageable(id);
  await db.announcement.update({ where: { id }, data: { pinned } });
  await audit({ actorId: actor.id, action: pinned ? "announcement.pin" : "announcement.unpin", entityType: "Announcement", entityId: id });
}

export async function setAnnouncementArchived(actor: Viewer, id: string, archived: boolean) {
  assertCan(actor, "announcements.manage");
  await findManageable(id);
  // Archiving also unpins so archived posts never linger at the top.
  await db.announcement.update({ where: { id }, data: archived ? { archived, pinned: false } : { archived } });
  await audit({
    actorId: actor.id,
    action: archived ? "announcement.archive" : "announcement.unarchive",
    entityType: "Announcement",
    entityId: id,
  });
}

export async function deleteAnnouncement(actor: Viewer, id: string) {
  assertCan(actor, "announcements.manage");
  const existing = await findManageable(id);
  await db.announcement.update({ where: { id }, data: { deletedAt: new Date(), pinned: false } });
  await audit({
    actorId: actor.id,
    action: "announcement.delete",
    entityType: "Announcement",
    entityId: id,
    metadata: { title: existing.title },
  });
}
