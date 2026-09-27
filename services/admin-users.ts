import "server-only";
import { db } from "@/lib/db";
import { assertCan, can } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  adminUserPatchSchema,
  createStudentSchema,
  restrictionSchema,
  roleSchema,
  statusSchema,
  studentFiltersSchema,
  updateStudentSchema,
  type StudentFilters,
} from "@/lib/validation/admin";
import { computeCompletion } from "@/services/profiles";
import { recordAudit } from "@/services/audit-log";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AccountStatus, Role } from "@/lib/generated/prisma/enums";

export const STUDENTS_PAGE_SIZE = 25;

const completionProfileSelect = {
  fullName: true,
  studentId: true,
  isVerified: true,
  avatarKey: true,
  bio: true,
  location: true,
  dateOfBirth: true,
  phone: true,
  bloodGroup: true,
  interests: true,
  githubUrl: true,
  linkedinUrl: true,
  currentOrganization: true,
  cvKey: true,
  nickname: true,
} satisfies Prisma.StudentProfileSelect;

const rowSelect = {
  id: true,
  roll: true,
  email: true,
  role: true,
  status: true,
  mustChangePassword: true,
  lockedUntil: true,
  postingRestrictedUntil: true,
  restrictionReason: true,
  lastLoginAt: true,
  lastActiveAt: true,
  failedLoginAttempts: true,
  isDemo: true,
  createdAt: true,
  deletedAt: true,
  profile: { select: completionProfileSelect },
  _count: { select: { skills: true } },
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof rowSelect }>;

export type AdminStudentRow = {
  id: string;
  roll: string;
  fullName: string;
  email: string | null;
  studentId: string | null;
  avatarKey: string | null;
  role: Role;
  status: AccountStatus;
  deleted: boolean;
  mustChangePassword: boolean;
  locked: boolean;
  restrictedUntil: Date | null;
  restrictionReason: string | null;
  isVerified: boolean;
  hasProfile: boolean;
  isDemo: boolean;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  failedLoginAttempts: number;
  completion: number;
};

function toRow(u: Row, now = Date.now()): AdminStudentRow {
  return {
    id: u.id,
    roll: u.roll,
    fullName: u.profile?.fullName ?? u.roll,
    email: u.email,
    studentId: u.profile?.studentId ?? null,
    avatarKey: u.profile?.avatarKey ?? null,
    role: u.role,
    status: u.status,
    deleted: Boolean(u.deletedAt),
    mustChangePassword: u.mustChangePassword,
    locked: Boolean(u.lockedUntil && u.lockedUntil.getTime() > now),
    restrictedUntil: u.postingRestrictedUntil && u.postingRestrictedUntil.getTime() > now ? u.postingRestrictedUntil : null,
    restrictionReason: u.restrictionReason,
    isVerified: u.profile?.isVerified ?? false,
    hasProfile: Boolean(u.profile),
    isDemo: u.isDemo,
    lastLoginAt: u.lastLoginAt,
    lastActiveAt: u.lastActiveAt,
    createdAt: u.createdAt,
    deletedAt: u.deletedAt,
    failedLoginAttempts: u.failedLoginAttempts,
    completion: computeCompletion(u.profile, u.email, u._count.skills),
  };
}

// ───────────────────────────── Queries ─────────────────────────────

export async function listStudents(actor: Viewer, input: unknown) {
  assertCan(actor, "students.manage");
  const filters: StudentFilters = studentFiltersSchema.parse(input);
  const now = new Date();

  const and: Prisma.UserWhereInput[] = [filters.deleted ? { deletedAt: { not: null } } : { deletedAt: null }];
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { roll: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { profile: { is: { fullName: { contains: q, mode: "insensitive" } } } },
        { profile: { is: { studentId: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (filters.role) and.push({ role: filters.role });
  if (filters.status) and.push({ status: filters.status === "active" ? "ACTIVE" : "DISABLED" });
  if (filters.flag === "default_password") and.push({ mustChangePassword: true });
  if (filters.flag === "locked") and.push({ lockedUntil: { gt: now } });
  if (filters.flag === "restricted") and.push({ postingRestrictedUntil: { gt: now } });
  if (filters.flag === "unverified") and.push({ OR: [{ profile: { is: null } }, { profile: { is: { isVerified: false } } }] });

  const where: Prisma.UserWhereInput = { AND: and };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { roll: "asc" },
      skip: (filters.page - 1) * STUDENTS_PAGE_SIZE,
      take: STUDENTS_PAGE_SIZE,
      select: rowSelect,
    }),
  ]);

  return {
    filters,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE)),
    students: rows.map((r) => toRow(r, now.getTime())),
  };
}

export async function getStudentDetail(actor: Viewer, id: string) {
  assertCan(actor, "students.manage");
  const user = await db.user.findUnique({
    where: { id },
    select: {
      ...rowSelect,
      _count: { select: { skills: true, sessions: true, posts: true, comments: true, reportsFiled: true } },
    },
  });
  if (!user) throw new NotFoundError("No account with that id.");
  const [recentAudit, activeAdmins] = await Promise.all([
    db.auditLog.findMany({
      where: { entityType: "User", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, createdAt: true, actor: { select: { roll: true } } },
    }),
    countActiveAdmins(),
  ]);
  return {
    ...toRow(user),
    counts: {
      sessions: user._count.sessions,
      posts: user._count.posts,
      comments: user._count.comments,
      reportsFiled: user._count.reportsFiled,
      skills: user._count.skills,
    },
    isLastActiveAdmin: user.role === "ADMIN" && user.status === "ACTIVE" && !user.deletedAt && activeAdmins <= 1,
    recentAudit,
  };
}

export type AdminStudentDetail = Awaited<ReturnType<typeof getStudentDetail>>;

// ───────────────────────────── Guards ─────────────────────────────

const activeAdminWhere = { role: "ADMIN", status: "ACTIVE", deletedAt: null } satisfies Prisma.UserWhereInput;

function countActiveAdmins(tx: Prisma.TransactionClient = db) {
  return tx.user.count({ where: activeAdminWhere });
}

async function loadTarget(tx: Prisma.TransactionClient, id: string) {
  const user = await tx.user.findUnique({
    where: { id },
    select: { id: true, roll: true, role: true, status: true, deletedAt: true, email: true },
  });
  if (!user) throw new NotFoundError("No account with that id.");
  return user;
}

type Target = Awaited<ReturnType<typeof loadTarget>>;

function assertNotSelf(actor: Viewer, target: Target, message: string) {
  if (actor.id === target.id) throw new ForbiddenError(message);
}

function assertNotDeleted(target: Target) {
  if (target.deletedAt) throw new AppError("This account is deleted. Restore it first.", 409);
}

/** Refuses a change that would leave the system without an active admin. */
async function assertAnotherAdminRemains(tx: Prisma.TransactionClient, target: Target) {
  const isActiveAdmin = target.role === "ADMIN" && target.status === "ACTIVE" && !target.deletedAt;
  if (!isActiveAdmin) return;
  const others = await tx.user.count({ where: { ...activeAdminWhere, id: { not: target.id } } });
  if (others < 1) throw new AppError("This is the last active admin. Promote another admin first.", 409);
}

async function assertUnique(
  tx: Prisma.TransactionClient,
  fields: { email?: string | null; studentId?: string | null; roll?: string },
  exceptUserId?: string,
) {
  const errors: Record<string, string[]> = {};
  const not = exceptUserId ? { not: exceptUserId } : undefined;
  if (fields.roll) {
    const taken = await tx.user.findFirst({ where: { roll: { equals: fields.roll, mode: "insensitive" } }, select: { id: true } });
    if (taken) errors.roll = ["An account with this roll already exists."];
  }
  if (fields.email) {
    const taken = await tx.user.findFirst({
      where: { email: { equals: fields.email, mode: "insensitive" }, ...(not ? { id: not } : {}) },
      select: { id: true },
    });
    if (taken) errors.email = ["This email is already used by another account."];
  }
  if (fields.studentId) {
    const taken = await tx.studentProfile.findFirst({
      where: { studentId: { equals: fields.studentId, mode: "insensitive" }, ...(not ? { userId: not } : {}) },
      select: { userId: true },
    });
    if (taken) errors.studentId = ["This student ID is already used by another account."];
  }
  const first = Object.values(errors)[0]?.[0];
  if (first) throw new ValidationError(first, errors);
}

// ───────────────────────────── Mutations ─────────────────────────────

export async function createStudent(actor: Viewer, input: unknown) {
  assertCan(actor, "students.manage");
  const data = createStudentSchema.parse(input);
  await assertUnique(db, { roll: data.roll, email: data.email, studentId: data.studentId });

  const passwordHash = await hashPassword(data.roll);
  const user = await db.user.create({
    data: {
      roll: data.roll,
      email: data.email,
      passwordHash,
      mustChangePassword: true,
      profile: { create: { fullName: data.fullName, studentId: data.studentId } },
      privacy: { create: {} },
    },
    select: { id: true, roll: true },
  });
  await recordAudit(actor, "students.create", "User", user.id, { roll: user.roll });
  return user;
}

export async function updateStudent(actor: Viewer, id: string, input: unknown) {
  assertCan(actor, "students.manage");
  const data = updateStudentSchema.parse(input);
  const target = await loadTarget(db, id);
  assertNotDeleted(target);
  await assertUnique(db, { email: data.email, studentId: data.studentId }, id);

  const profileData: Prisma.StudentProfileUpdateInput = {};
  if (data.fullName !== undefined) profileData.fullName = data.fullName;
  if (data.studentId !== undefined) profileData.studentId = data.studentId;

  await db.$transaction(async (tx) => {
    if (data.email !== undefined) await tx.user.update({ where: { id }, data: { email: data.email } });
    if (Object.keys(profileData).length) {
      await tx.studentProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: { userId: id, fullName: data.fullName ?? target.roll, studentId: data.studentId ?? null },
      });
    }
  });
  const changed = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);
  await recordAudit(actor, "students.update", "User", id, { roll: target.roll, fields: changed });
}

export async function setRole(actor: Viewer, id: string, input: unknown) {
  assertCan(actor, "roles.assign");
  const role = roleSchema.parse(input);
  const previous = await db.$transaction(async (tx) => {
    const target = await loadTarget(tx, id);
    assertNotSelf(actor, target, "You can't change your own role.");
    assertNotDeleted(target);
    if (target.role === role) return target.role;
    if (role !== "ADMIN") await assertAnotherAdminRemains(tx, target);
    await tx.user.update({ where: { id }, data: { role } });
    return target.role;
  });
  if (previous !== role) {
    await recordAudit(actor, "students.role", "User", id, { from: previous, to: role });
  }
}

export async function setStatus(actor: Viewer, id: string, input: unknown) {
  assertCan(actor, "students.manage");
  const status = statusSchema.parse(input);
  const target = await db.$transaction(async (tx) => {
    const t = await loadTarget(tx, id);
    assertNotSelf(actor, t, "You can't disable your own account.");
    assertNotDeleted(t);
    if (status === "DISABLED") await assertAnotherAdminRemains(tx, t);
    await tx.user.update({ where: { id }, data: { status } });
    return t;
  });
  if (status === "DISABLED") await revokeAllSessions(id);
  await recordAudit(actor, status === "DISABLED" ? "students.disable" : "students.enable", "User", id, { roll: target.roll });
}

export async function resetPassword(actor: Viewer, id: string) {
  assertCan(actor, "students.manage");
  const target = await loadTarget(db, id);
  assertNotDeleted(target);
  if (target.id === actor.id) throw new ForbiddenError("Use Settings to change your own password.");
  const passwordHash = await hashPassword(target.roll);
  await db.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null, passwordChangedAt: new Date() },
  });
  await db.passwordResetToken.deleteMany({ where: { userId: id, usedAt: null } });
  await revokeAllSessions(id);
  await recordAudit(actor, "students.reset_password", "User", id, { roll: target.roll });
}

export async function deleteStudent(actor: Viewer, id: string) {
  assertCan(actor, "students.manage");
  const target = await db.$transaction(async (tx) => {
    const t = await loadTarget(tx, id);
    assertNotSelf(actor, t, "You can't delete your own account.");
    if (t.deletedAt) throw new AppError("This account is already deleted.", 409);
    await assertAnotherAdminRemains(tx, t);
    await tx.user.update({ where: { id }, data: { deletedAt: new Date(), status: "DISABLED" } });
    return t;
  });
  await revokeAllSessions(id);
  await recordAudit(actor, "students.delete", "User", id, { roll: target.roll });
}

export async function restoreStudent(actor: Viewer, id: string) {
  assertCan(actor, "students.manage");
  const target = await loadTarget(db, id);
  if (!target.deletedAt) throw new AppError("This account isn't deleted.", 409);
  await db.user.update({ where: { id }, data: { deletedAt: null, status: "ACTIVE" } });
  await recordAudit(actor, "students.restore", "User", id, { roll: target.roll });
}

export async function unlockStudent(actor: Viewer, id: string) {
  assertCan(actor, "students.manage");
  const target = await loadTarget(db, id);
  await db.user.update({ where: { id }, data: { lockedUntil: null, failedLoginAttempts: 0 } });
  await recordAudit(actor, "students.unlock", "User", id, { roll: target.roll });
}

export async function setVerified(actor: Viewer, id: string, verified: boolean) {
  assertCan(actor, "students.manage");
  const target = await loadTarget(db, id);
  assertNotDeleted(target);
  const result = await db.studentProfile.updateMany({ where: { userId: id }, data: { isVerified: verified } });
  if (result.count === 0) throw new AppError("This account has no profile yet.", 409);
  await recordAudit(actor, verified ? "students.verify" : "students.unverify", "User", id, { roll: target.roll });
}

/**
 * Posting restriction (until a date) or lifting it (`until: null`).
 * Moderators may restrict students only; nobody can restrict themselves.
 */
export async function setPostingRestriction(actor: Viewer, id: string, input: unknown) {
  assertCan(actor, "users.restrict");
  const data = restrictionSchema.parse(input);
  const target = await loadTarget(db, id);
  if (data.until) {
    assertNotSelf(actor, target, "You can't restrict your own account.");
    if (!can(actor.role, "roles.assign") && target.role !== "STUDENT") {
      throw new ForbiddenError("Only admins can restrict staff accounts.");
    }
  }
  await db.user.update({
    where: { id },
    data: { postingRestrictedUntil: data.until, restrictionReason: data.until ? data.reason : null },
  });
  await recordAudit(actor, data.until ? "users.restrict" : "users.unrestrict", "User", id, {
    roll: target.roll,
    ...(data.until ? { until: data.until.toISOString(), reason: data.reason } : {}),
  });
}

/** Single entry point for PATCH /api/admin/users/:id. */
export async function applyUserPatch(actor: Viewer, id: string, input: unknown) {
  const patch = adminUserPatchSchema.parse(input);
  switch (patch.action) {
    case "update": {
      const { action: _action, ...fields } = patch;
      void _action;
      return updateStudent(actor, id, fields);
    }
    case "setRole":
      return setRole(actor, id, patch.role);
    case "setStatus":
      return setStatus(actor, id, patch.status);
    case "resetPassword":
      return resetPassword(actor, id);
    case "delete":
      return deleteStudent(actor, id);
    case "restore":
      return restoreStudent(actor, id);
    case "unlock":
      return unlockStudent(actor, id);
    case "verify":
      return setVerified(actor, id, patch.verified);
    case "restrict":
      return setPostingRestriction(actor, id, { until: patch.until?.toISOString() ?? null, reason: patch.reason ?? undefined });
  }
}

/** Accounts with an active posting restriction (for the moderation page). */
export async function listRestrictedUsers(actor: Viewer) {
  assertCan(actor, "users.restrict");
  const rows = await db.user.findMany({
    where: { postingRestrictedUntil: { gt: new Date() }, deletedAt: null },
    orderBy: { postingRestrictedUntil: "asc" },
    take: 100,
    select: {
      id: true,
      roll: true,
      role: true,
      postingRestrictedUntil: true,
      restrictionReason: true,
      profile: { select: { fullName: true, avatarKey: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    roll: r.roll,
    role: r.role,
    name: r.profile?.fullName ?? r.roll,
    avatarKey: r.profile?.avatarKey ?? null,
    until: r.postingRestrictedUntil!,
    reason: r.restrictionReason,
  }));
}
