import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import type { Viewer } from "@/lib/privacy";

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  actorId?: string | null;
  /** When set, a user receives at most one notification with this key. */
  dedupeKey?: string | null;
};

/** Sends a notification to specific users (never to the actor themself). */
export async function notifyUsers(userIds: string[], payload: NotificationPayload) {
  const recipients = [...new Set(userIds)].filter((id) => id && id !== payload.actorId);
  if (recipients.length === 0) return;
  await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title.slice(0, 200),
      body: payload.body?.slice(0, 500) ?? null,
      link: payload.link ?? null,
      actorId: payload.actorId ?? null,
      dedupeKey: payload.dedupeKey ?? null,
    })),
    skipDuplicates: true,
  });
}

/** Broadcasts to every active batch member (announcements, polls, new events). */
export async function notifyBatch(payload: NotificationPayload) {
  const users = await db.user.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  await notifyUsers(
    users.map((u) => u.id),
    payload,
  );
}

export function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(viewer: Viewer, opts: { unreadOnly?: boolean; take?: number } = {}) {
  return db.notification.findMany({
    where: { userId: viewer.id, ...(opts.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50,
    include: { actor: { select: { roll: true, profile: { select: { fullName: true, avatarKey: true } } } } },
  });
}

export async function markNotificationRead(viewer: Viewer, id: string) {
  // Scoped by userId so nobody can touch someone else's notifications.
  await db.notification.updateMany({ where: { id, userId: viewer.id, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(viewer: Viewer) {
  await db.notification.updateMany({ where: { userId: viewer.id, readAt: null }, data: { readAt: new Date() } });
}

export async function deleteReadNotifications(viewer: Viewer) {
  await db.notification.deleteMany({ where: { userId: viewer.id, readAt: { not: null } } });
}
