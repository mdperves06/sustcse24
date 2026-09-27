import "server-only";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";
import { SESSION_IDLE_MS, SESSION_REMEMBER_MS, SESSION_TOUCH_MS } from "./constants";
import type { Role } from "@/lib/generated/prisma/enums";

export type SessionUser = {
  id: string;
  roll: string;
  role: Role;
  mustChangePassword: boolean;
  fullName: string;
  avatarKey: string | null;
  sessionId: string;
};

type CreateSessionOptions = {
  rememberMe: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
};

/** Creates a database-backed session and returns the raw token (to be placed in a cookie). */
export async function createSession(userId: string, opts: CreateSessionOptions) {
  const token = generateToken();
  const ttl = opts.rememberMe ? SESSION_REMEMBER_MS : SESSION_IDLE_MS;
  const expiresAt = new Date(Date.now() + ttl);
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      rememberMe: opts.rememberMe,
      userAgent: opts.userAgent?.slice(0, 300) ?? null,
      ipAddress: opts.ipAddress?.slice(0, 64) ?? null,
    },
  });
  return { token, expiresAt };
}

/**
 * Validates a raw session token. Expired sessions, disabled accounts and
 * soft-deleted accounts are rejected. Active sessions slide forward.
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          roll: true,
          role: true,
          status: true,
          deletedAt: true,
          mustChangePassword: true,
          profile: { select: { fullName: true, avatarKey: true } },
        },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  const { user } = session;
  if (session.expiresAt.getTime() <= now || user.status !== "ACTIVE" || user.deletedAt) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (now - session.lastSeenAt.getTime() > SESSION_TOUCH_MS) {
    const ttl = session.rememberMe ? SESSION_REMEMBER_MS : SESSION_IDLE_MS;
    await db.$transaction([
      db.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now), expiresAt: new Date(now + ttl) },
      }),
      db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date(now) } }),
    ]);
  }

  return {
    id: user.id,
    roll: user.roll,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    fullName: user.profile?.fullName ?? user.roll,
    avatarKey: user.profile?.avatarKey ?? null,
    sessionId: session.id,
  };
}

export async function revokeSessionToken(token: string) {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

export async function purgeExpiredSessions() {
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
