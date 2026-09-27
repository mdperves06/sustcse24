import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { enforceRateLimit } from "@/lib/rate-limit";
import { canSee, DEFAULT_PRIVACY, sharedWithBatch, type Viewer } from "@/lib/privacy";
import { activeUserWhere, authorSelect, toAuthor, type Author } from "@/lib/selects";
import { idSchema, requiredText } from "@/lib/validation/common";
import { appToday } from "@/lib/time";
import { notifyUsers } from "@/services/notifications";

/** A batch member's birthday. Only day and month — the birth year is never exposed. */
export type BirthdayPerson = {
  userId: string;
  roll: string;
  name: string;
  avatarKey: string | null;
  /** Actual birthday month/day (29 Feb stays 29 Feb). */
  month: number;
  day: number;
  /** Days until the next celebration in Dhaka (0 = today). Feb 29 is celebrated on Feb 28 in non-leap years. */
  daysAway: number;
};

export const wishSchema = z.object({
  toUserId: idSchema,
  message: requiredText(280, "Message"),
});

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The date a birthday is celebrated in a given year (Feb 29 → Feb 28 in non-leap years). */
export function celebrationDate(year: number, month: number, day: number): { month: number; day: number } {
  if (month === 2 && day === 29 && !isLeap(year)) return { month: 2, day: 28 };
  return { month, day };
}

function daysAwayFrom(today: { year: number; month: number; day: number }, month: number, day: number): number {
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  for (const year of [today.year, today.year + 1]) {
    const c = celebrationDate(year, month, day);
    const t = Date.UTC(year, c.month - 1, c.day);
    if (t >= todayUtc) return Math.round((t - todayUtc) / 86_400_000);
  }
  return 366;
}

/**
 * Everyone whose birthday the viewer may see: members who share it with the batch,
 * plus the viewer themself. Privacy is enforced both in the query and after it.
 */
export async function listVisibleBirthdays(viewer: Viewer, now = new Date()): Promise<BirthdayPerson[]> {
  const rows = await db.user.findMany({
    where: {
      ...activeUserWhere,
      profile: { is: { dateOfBirth: { not: null } } },
      AND: [{ OR: [sharedWithBatch("birthdayVisibility"), { id: viewer.id }] }],
    },
    select: {
      id: true,
      roll: true,
      privacy: { select: { birthdayVisibility: true } },
      profile: { select: { fullName: true, avatarKey: true, dateOfBirth: true } },
    },
  });
  const today = appToday(now);
  const out: BirthdayPerson[] = [];
  for (const r of rows) {
    const dob = r.profile?.dateOfBirth;
    if (!dob) continue;
    if (!canSee(r.privacy?.birthdayVisibility ?? DEFAULT_PRIVACY.birthdayVisibility, viewer, r.id)) continue;
    const month = dob.getUTCMonth() + 1;
    const day = dob.getUTCDate();
    out.push({
      userId: r.id,
      roll: r.roll,
      name: r.profile?.fullName ?? r.roll,
      avatarKey: r.profile?.avatarKey ?? null,
      month,
      day,
      daysAway: daysAwayFrom(today, month, day),
    });
  }
  return out.sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name));
}

// ───────────── Dashboard exports ─────────────

export async function getTodaysBirthdays(viewer: Viewer): Promise<BirthdayPerson[]> {
  return (await listVisibleBirthdays(viewer)).filter((p) => p.daysAway === 0);
}

/** Birthdays in the next `days` days, excluding today. */
export async function getUpcomingBirthdays(viewer: Viewer, days = 14): Promise<BirthdayPerson[]> {
  return (await listVisibleBirthdays(viewer)).filter((p) => p.daysAway > 0 && p.daysAway <= days);
}

// ───────────── Wishes ─────────────

export type ReceivedWish = { id: string; message: string; createdAt: Date; from: Author };

/** Which of these users the viewer already wished this (Dhaka) year. */
export async function getWishedUserIds(viewer: Viewer, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db.birthdayWish.findMany({
    where: { fromUserId: viewer.id, toUserId: { in: userIds }, year: appToday().year },
    select: { toUserId: true },
  });
  return new Set(rows.map((r) => r.toUserId));
}

export async function getReceivedWishes(viewer: Viewer): Promise<ReceivedWish[]> {
  const rows = await db.birthdayWish.findMany({
    where: { toUserId: viewer.id, year: appToday().year, fromUser: activeUserWhere },
    orderBy: { createdAt: "desc" },
    select: { id: true, message: true, createdAt: true, fromUser: { select: authorSelect } },
  });
  return rows.map((r) => ({ id: r.id, message: r.message, createdAt: r.createdAt, from: toAuthor(r.fromUser) }));
}

/**
 * Sends a wish to someone whose birthday is today (Dhaka). One wish per sender →
 * recipient per year, enforced by a unique constraint.
 */
export async function sendBirthdayWish(actor: Viewer & { fullName?: string }, input: unknown) {
  const data = wishSchema.parse(input);
  if (data.toUserId === actor.id) throw new ValidationError("You can't send a birthday wish to yourself.");
  await enforceRateLimit(`birthday-wish:${actor.id}`, 20, 3600, "You've sent a lot of wishes — please wait a bit.");

  const person = (await listVisibleBirthdays(actor)).find((p) => p.userId === data.toUserId);
  // Hidden or unknown birthdays look the same as "not found" so privacy isn't leaked.
  if (!person) throw new NotFoundError("We couldn't find that batch member's birthday.");
  if (person.daysAway !== 0) throw new ValidationError("You can only send wishes on their birthday.");

  const year = appToday().year;
  try {
    await db.birthdayWish.create({
      data: { fromUserId: actor.id, toUserId: data.toUserId, year, message: data.message },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("You've already sent a wish this year.");
    }
    throw error;
  }

  const sender = await db.studentProfile.findUnique({ where: { userId: actor.id }, select: { fullName: true } });
  await notifyUsers([data.toUserId], {
    type: "BIRTHDAY",
    title: `🎂 ${sender?.fullName ?? actor.fullName ?? "A batchmate"} sent you a birthday wish`,
    body: data.message,
    link: "/birthdays",
    actorId: actor.id,
  });
}

/** True when today (Dhaka) is the viewer's birthday. */
export async function isViewerBirthdayToday(viewer: Viewer): Promise<boolean> {
  const profile = await db.studentProfile.findUnique({ where: { userId: viewer.id }, select: { dateOfBirth: true } });
  if (!profile?.dateOfBirth) return false;
  return daysAwayFrom(appToday(), profile.dateOfBirth.getUTCMonth() + 1, profile.dateOfBirth.getUTCDate()) === 0;
}
