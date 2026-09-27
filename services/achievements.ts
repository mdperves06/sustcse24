import "server-only";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AchievementCategory, AchievementStatus } from "@/lib/generated/prisma/enums";
import { notifyUsers } from "@/services/notifications";
import {
  achievementFiltersSchema,
  achievementSchema,
  rejectAchievementSchema,
} from "@/lib/validation/achievements";

export type AchievementItem = {
  id: string;
  title: string;
  description: string | null;
  category: AchievementCategory;
  achievedOn: Date | null;
  link: string | null;
  status: AchievementStatus;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  owner: Author;
  verifiedBy: Author | null;
};

const achievementSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  achievedOn: true,
  link: true,
  status: true,
  rejectionReason: true,
  verifiedAt: true,
  createdAt: true,
  user: { select: authorSelect },
  verifiedBy: { select: authorSelect },
} satisfies Prisma.AchievementSelect;

type AchievementRow = Prisma.AchievementGetPayload<{ select: typeof achievementSelect }>;

function toItem(row: AchievementRow): AchievementItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    achievedOn: row.achievedOn,
    link: row.link,
    status: row.status,
    rejectionReason: row.rejectionReason,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    owner: toAuthor(row.user),
    verifiedBy: row.verifiedBy ? toAuthor(row.verifiedBy) : null,
  };
}

const liveOwner = { user: { deletedAt: null, status: "ACTIVE" } } satisfies Prisma.AchievementWhereInput;

/** Hall of Fame: VERIFIED achievements only (optionally one category). */
export async function listVerifiedAchievements(input: Record<string, unknown> = {}, take = 120) {
  const filters = achievementFiltersSchema.parse(input);
  const rows = await db.achievement.findMany({
    where: { status: "VERIFIED", deletedAt: null, ...liveOwner, ...(filters.category ? { category: filters.category } : {}) },
    orderBy: [{ achievedOn: { sort: "desc", nulls: "last" } }, { verifiedAt: "desc" }],
    take,
    select: achievementSelect,
  });
  return rows.map(toItem);
}

export async function getHallOfFameStats() {
  const where = { status: "VERIFIED", deletedAt: null, ...liveOwner } satisfies Prisma.AchievementWhereInput;
  const [total, byCategory, members] = await Promise.all([
    db.achievement.count({ where }),
    db.achievement.groupBy({ by: ["category"], where, _count: { _all: true } }),
    db.achievement.findMany({ where, distinct: ["userId"], select: { userId: true } }),
  ]);
  return {
    total,
    members: members.length,
    byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count._all])) as Partial<
      Record<AchievementCategory, number>
    >,
  };
}

export async function listOwnAchievements(viewer: Viewer) {
  const rows = await db.achievement.findMany({
    where: { userId: viewer.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: achievementSelect,
  });
  return rows.map(toItem);
}

export async function submitAchievement(actor: Viewer, input: unknown) {
  const data = achievementSchema.parse(input);
  await enforceRateLimit(`achievement:submit:${actor.id}`, 10, 3600, "You've submitted a lot of achievements — try again later.");
  return db.achievement.create({
    data: { ...data, userId: actor.id, status: "PENDING" },
    select: { id: true, status: true },
  });
}

/** Owners can withdraw a submission while it's still pending (soft delete). */
export async function deleteOwnAchievement(actor: Viewer, id: string) {
  const row = await db.achievement.findFirst({ where: { id, deletedAt: null }, select: { userId: true, status: true } });
  if (!row) throw new NotFoundError("That submission no longer exists.");
  if (row.userId !== actor.id) throw new ForbiddenError("You can only delete your own submissions.");
  if (row.status !== "PENDING") throw new ConflictError("Only pending submissions can be deleted.");
  await db.achievement.update({ where: { id }, data: { deletedAt: new Date() } });
}

// ───────────── Review (achievements.verify) ─────────────

export async function listPendingAchievements(actor: Viewer) {
  assertCan(actor, "achievements.verify");
  const rows = await db.achievement.findMany({
    where: { status: "PENDING", deletedAt: null, ...liveOwner },
    orderBy: { createdAt: "asc" },
    select: achievementSelect,
  });
  return rows.map(toItem);
}

export async function countPendingAchievements(actor: Viewer) {
  assertCan(actor, "achievements.verify");
  return db.achievement.count({ where: { status: "PENDING", deletedAt: null, ...liveOwner } });
}

/** Recently reviewed items so staff can revoke a verification. */
export async function listRecentlyReviewed(actor: Viewer, take = 20) {
  assertCan(actor, "achievements.verify");
  const rows = await db.achievement.findMany({
    where: { status: { in: ["VERIFIED", "REJECTED"] }, deletedAt: null },
    orderBy: [{ verifiedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take,
    select: achievementSelect,
  });
  return rows.map(toItem);
}

async function loadForReview(id: string) {
  const row = await db.achievement.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true, title: true, status: true },
  });
  if (!row) throw new NotFoundError("That submission no longer exists.");
  return row;
}

export async function verifyAchievement(actor: Viewer, id: string) {
  assertCan(actor, "achievements.verify");
  const row = await loadForReview(id);
  if (row.userId === actor.id) throw new ForbiddenError("Ask another moderator to verify your own achievement.");
  if (row.status === "VERIFIED") throw new ConflictError("This achievement is already verified.");
  await db.achievement.update({
    where: { id },
    data: { status: "VERIFIED", verifiedById: actor.id, verifiedAt: new Date(), rejectionReason: null },
  });
  await audit({ actorId: actor.id, action: "achievement.verify", entityType: "Achievement", entityId: id, metadata: { title: row.title } });
  await notifyUsers([row.userId], {
    type: "ACHIEVEMENT_VERIFICATION",
    title: "Your achievement was verified 🎉",
    body: `“${row.title}” is now in the CSE 24 Hall of Fame.`,
    link: "/achievements",
    actorId: actor.id,
  });
}

export async function rejectAchievement(actor: Viewer, id: string, input: unknown) {
  assertCan(actor, "achievements.verify");
  const { reason } = rejectAchievementSchema.parse(input);
  const row = await loadForReview(id);
  if (row.userId === actor.id) throw new ForbiddenError("Ask another moderator to review your own achievement.");
  await db.achievement.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: reason, verifiedById: actor.id, verifiedAt: new Date() },
  });
  await audit({
    actorId: actor.id,
    action: "achievement.reject",
    entityType: "Achievement",
    entityId: id,
    metadata: { title: row.title, reason },
  });
  await notifyUsers([row.userId], {
    type: "ACHIEVEMENT_VERIFICATION",
    title: "Your achievement submission needs changes",
    body: `“${row.title}” wasn't verified: ${reason}`,
    link: "/achievements#mine",
    actorId: actor.id,
  });
}

/** Moves a reviewed achievement back to the pending queue (removes the verified badge). */
export async function revokeAchievementReview(actor: Viewer, id: string) {
  assertCan(actor, "achievements.verify");
  const row = await loadForReview(id);
  if (row.status === "PENDING") throw new ConflictError("This submission is already pending.");
  await db.achievement.update({
    where: { id },
    data: { status: "PENDING", verifiedById: null, verifiedAt: null, rejectionReason: null },
  });
  await audit({
    actorId: actor.id,
    action: "achievement.revoke",
    entityType: "Achievement",
    entityId: id,
    metadata: { title: row.title, previousStatus: row.status },
  });
  if (row.status === "VERIFIED") {
    await notifyUsers([row.userId], {
      type: "ACHIEVEMENT_VERIFICATION",
      title: "An achievement verification was revoked",
      body: `“${row.title}” is back under review.`,
      link: "/achievements#mine",
      actorId: actor.id,
    });
  }
}
