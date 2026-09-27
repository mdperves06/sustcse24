import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, isDefaultPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, revokeAllSessions } from "@/lib/auth/session";
import { LOCKOUT_MS, MAX_FAILED_LOGINS, PASSWORD_RESET_TTL_MS } from "@/lib/auth/constants";
import { generateToken, hashToken } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mailer";
import { AppError, ValidationError } from "@/lib/errors";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

const INVALID_CREDENTIALS = "Incorrect roll or password.";

export type ClientInfo = { ip: string; userAgent: string | null };

/**
 * Authenticates a student by roll + password.
 * - Rate-limited per IP and per roll.
 * - Locks the account for 15 minutes after 5 consecutive failures.
 * - Flags accounts still using their default (roll) password.
 */
export async function login(input: unknown, client: ClientInfo) {
  const data = loginSchema.parse(input);
  const roll = data.roll.trim();

  await enforceRateLimit(`login:ip:${client.ip}`, 30, 15 * 60);
  await enforceRateLimit(`login:roll:${roll.toLowerCase()}`, 10, 15 * 60);

  const user = await db.user.findUnique({
    where: { roll },
    select: {
      id: true,
      roll: true,
      passwordHash: true,
      status: true,
      deletedAt: true,
      lockedUntil: true,
      failedLoginAttempts: true,
      mustChangePassword: true,
    },
  });

  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      "This account is temporarily locked after too many failed attempts. Try again in 15 minutes.",
      423,
    );
  }

  const valid = await verifyPassword(data.password, user?.passwordHash);

  if (!user || !valid) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      const lock = attempts >= MAX_FAILED_LOGINS;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MS) : null,
        },
      });
    }
    throw new AppError(INVALID_CREDENTIALS, 401);
  }

  if (user.deletedAt) throw new AppError(INVALID_CREDENTIALS, 401);
  if (user.status !== "ACTIVE") {
    throw new AppError("This account has been disabled. Contact a batch admin.", 403);
  }

  // Default-password detection: a roll-as-password login always forces a change.
  const mustChangePassword = user.mustChangePassword || isDefaultPassword(data.password, user.roll);

  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      mustChangePassword,
    },
  });

  const session = await createSession(user.id, {
    rememberMe: data.remember,
    userAgent: client.userAgent,
    ipAddress: client.ip,
  });

  return { ...session, userId: user.id, rememberMe: data.remember, mustChangePassword };
}

/** Changes the password for a signed-in user and signs out their other sessions. */
export async function changePassword(userId: string, currentSessionId: string, input: unknown) {
  const data = changePasswordSchema.parse(input);
  await enforceRateLimit(`change-password:${userId}`, 10, 15 * 60);

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, roll: true },
  });

  if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
    throw new ValidationError("Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }
  if (isDefaultPassword(data.newPassword, user.roll)) {
    throw new ValidationError("Your new password can't be your roll number.", {
      newPassword: ["Your new password can't be your roll number."],
    });
  }

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(data.newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
  await revokeAllSessions(userId, currentSessionId);
}

/**
 * Starts a password reset. Always resolves the same way from the caller's point of
 * view so the response never reveals whether an account exists.
 * Returns the raw token only so tests can complete the flow — callers must not expose it.
 */
export async function requestPasswordReset(input: unknown, client: ClientInfo): Promise<string | null> {
  const { identifier } = forgotPasswordSchema.parse(input);
  await enforceRateLimit(`forgot:ip:${client.ip}`, 5, 15 * 60);

  const user = await db.user.findFirst({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [{ roll: identifier }, { email: { equals: identifier, mode: "insensitive" } }],
    },
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  });
  if (!user?.email) return null;

  const perUser = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (perUser >= 3) return null;

  const token = generateToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: "Reset your CSE 24 Community password",
    text: [
      `Hi ${user.profile?.fullName ?? "there"},`,
      "",
      "Use the link below to set a new password. It expires in 30 minutes and can be used once.",
      "",
      link,
      "",
      "If you didn't request this, you can ignore this email.",
    ].join("\n"),
  });
  return token;
}

/** Completes a reset: validates the single-use token, sets the password, signs out everywhere. */
export async function resetPassword(input: unknown, client: ClientInfo) {
  const data = resetPasswordSchema.parse(input);
  await enforceRateLimit(`reset:ip:${client.ip}`, 10, 15 * 60);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(data.token) },
    include: { user: { select: { id: true, roll: true, status: true, deletedAt: true } } },
  });
  if (
    !record ||
    record.usedAt ||
    record.expiresAt.getTime() < Date.now() ||
    record.user.deletedAt ||
    record.user.status !== "ACTIVE"
  ) {
    throw new AppError("This reset link is invalid or has expired. Request a new one.", 400);
  }
  if (isDefaultPassword(data.newPassword, record.user.roll)) {
    throw new ValidationError("Your new password can't be your roll number.", {
      newPassword: ["Your new password can't be your roll number."],
    });
  }

  const passwordHash = await hashPassword(data.newPassword);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
}

export async function listSessions(userId: string) {
  return db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastSeenAt: true, rememberMe: true },
  });
}

export async function revokeSession(userId: string, sessionId: string) {
  await db.session.deleteMany({ where: { id: sessionId, userId } });
}
