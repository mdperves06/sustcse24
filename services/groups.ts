import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can } from "@/lib/auth/permissions";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import type { GroupRole } from "@/lib/generated/prisma/enums";
import type { Viewer } from "@/lib/privacy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { activeUserWhere, authorSelect, toAuthor, type Author } from "@/lib/selects";
import { groupDescriptionSchema, groupRoleSchema, groupSchema } from "@/lib/validation/groups";

export type GroupCardView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  memberCount: number;
  joined: boolean;
  myRole: GroupRole | null;
};

export type GroupMemberView = Author & { groupRole: GroupRole; joinedAt: Date };

export type GroupDetailView = GroupCardView & {
  createdAt: Date;
  members: GroupMemberView[];
  canManage: boolean;
  canEditDescription: boolean;
};

const activeMembers = { user: activeUserWhere } satisfies Prisma.GroupMemberWhereInput;

const groupCardSelect = (viewerId: string) =>
  ({
    id: true,
    slug: true,
    name: true,
    description: true,
    icon: true,
    createdAt: true,
    _count: { select: { members: { where: activeMembers } } },
    members: { where: { userId: viewerId }, select: { role: true } },
  }) satisfies Prisma.GroupSelect;

type GroupCardRow = Prisma.GroupGetPayload<{ select: ReturnType<typeof groupCardSelect> }>;

function toCard(row: GroupCardRow): GroupCardView {
  const mine = row.members[0] ?? null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    memberCount: row._count.members,
    joined: Boolean(mine),
    myRole: mine?.role ?? null,
  };
}

export async function isMember(groupId: string, userId: string) {
  const m = await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { userId: true } });
  return Boolean(m);
}

/** All active groups, the viewer's own groups first, then by name. */
export async function listGroups(viewer: Viewer): Promise<GroupCardView[]> {
  const rows = await db.group.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: groupCardSelect(viewer.id),
  });
  return rows.map(toCard).sort((a, b) => Number(b.joined) - Number(a.joined) || a.name.localeCompare(b.name));
}

export async function getGroupBySlug(viewer: Viewer, slug: string): Promise<GroupDetailView> {
  const row = await db.group.findFirst({
    where: { slug, deletedAt: null },
    select: {
      ...groupCardSelect(viewer.id),
      members: {
        where: activeMembers,
        orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
        select: { role: true, joinedAt: true, userId: true, user: { select: authorSelect } },
      },
    },
  });
  if (!row) throw new NotFoundError("This group doesn't exist.");
  const mine = row.members.find((m) => m.userId === viewer.id) ?? null;
  const staff = can(viewer.role, "groups.manage");
  const members = row.members
    .map((m) => ({ ...toAuthor(m.user), groupRole: m.role, joinedAt: m.joinedAt }))
    // MANAGER sorts before MEMBER regardless of enum ordering in the database.
    .sort((a, b) => Number(b.groupRole === "MANAGER") - Number(a.groupRole === "MANAGER") || a.joinedAt.getTime() - b.joinedAt.getTime());
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    createdAt: row.createdAt,
    memberCount: row._count.members,
    joined: Boolean(mine),
    myRole: mine?.role ?? null,
    members,
    canManage: staff,
    canEditDescription: staff || mine?.role === "MANAGER",
  };
}

async function findGroup(groupId: string) {
  const group = await db.group.findFirst({ where: { id: groupId, deletedAt: null }, select: { id: true, slug: true, name: true } });
  if (!group) throw new NotFoundError("This group doesn't exist.");
  return group;
}

// ───────────────────────────── Membership ─────────────────────────────

export async function joinGroup(actor: Viewer, groupId: string) {
  const group = await findGroup(groupId);
  await enforceRateLimit(`group:membership:${actor.id}`, 60, 3600);
  await db.groupMember.createMany({ data: [{ groupId: group.id, userId: actor.id }], skipDuplicates: true });
  return group;
}

export async function leaveGroup(actor: Viewer, groupId: string) {
  const group = await findGroup(groupId);
  await enforceRateLimit(`group:membership:${actor.id}`, 60, 3600);
  await db.groupMember.deleteMany({ where: { groupId: group.id, userId: actor.id } });
  return group;
}

// ───────────────────────────── Staff management ─────────────────────────────

export function slugify(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/g, "") || "group"
  );
}

/** Unique across all groups (including soft-deleted ones, since the DB constraint covers them). */
async function uniqueSlug(name: string) {
  const base = slugify(name);
  const taken = await db.group.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const used = new Set(taken.map((g) => g.slug));
  if (!used.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
  throw new ValidationError("Choose a more distinctive group name.");
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createGroup(actor: Viewer, input: unknown) {
  assertCan(actor, "groups.manage");
  const data = groupSchema.parse(input);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const group = await db.group.create({
        data: { name: data.name, description: data.description, icon: data.icon, slug: await uniqueSlug(data.name), createdById: actor.id },
        select: { id: true, slug: true, name: true },
      });
      await audit({ actorId: actor.id, action: "group.create", entityType: "Group", entityId: group.id, metadata: { name: group.name } });
      return group;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error; // concurrent create took the slug — retry
    }
  }
  throw new ValidationError("Couldn't create the group. Please try again.");
}

/**
 * Staff edit name, description and icon; group managers may only edit the description.
 * The slug is generated once at creation and stays stable so links never break.
 */
export async function updateGroup(actor: Viewer, groupId: string, input: unknown) {
  const group = await db.group.findFirst({
    where: { id: groupId, deletedAt: null },
    select: { id: true, slug: true, name: true, members: { where: { userId: actor.id }, select: { role: true } } },
  });
  if (!group) throw new NotFoundError("This group doesn't exist.");
  const staff = can(actor.role, "groups.manage");

  if (!staff) {
    if (group.members[0]?.role !== "MANAGER") throw new ForbiddenError("Only group managers and staff can edit this group.");
    const data = groupDescriptionSchema.parse(input);
    await db.group.update({ where: { id: group.id }, data: { description: data.description } });
    return { id: group.id, slug: group.slug };
  }

  const data = groupSchema.parse(input);
  const updated = await db.group.update({
    where: { id: group.id },
    data: { name: data.name, description: data.description, icon: data.icon },
    select: { id: true, slug: true },
  });
  await audit({
    actorId: actor.id,
    action: "group.update",
    entityType: "Group",
    entityId: group.id,
    metadata: { name: data.name, previousName: group.name },
  });
  return updated;
}

export async function deleteGroup(actor: Viewer, groupId: string) {
  assertCan(actor, "groups.manage");
  const group = await findGroup(groupId);
  await db.group.update({ where: { id: group.id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, action: "group.delete", entityType: "Group", entityId: group.id, metadata: { name: group.name } });
  return group;
}

export async function setMemberRole(actor: Viewer, groupId: string, userId: string, input: unknown) {
  assertCan(actor, "groups.manage");
  const { role } = groupRoleSchema.parse(input);
  const group = await findGroup(groupId);
  const res = await db.groupMember.updateMany({ where: { groupId: group.id, userId }, data: { role } });
  if (res.count === 0) throw new NotFoundError("That person isn't a member of this group.");
  await audit({
    actorId: actor.id,
    action: role === "MANAGER" ? "group.member.promote" : "group.member.demote",
    entityType: "Group",
    entityId: group.id,
    metadata: { userId },
  });
  return group;
}

export async function removeMember(actor: Viewer, groupId: string, userId: string) {
  assertCan(actor, "groups.manage");
  const group = await findGroup(groupId);
  const res = await db.groupMember.deleteMany({ where: { groupId: group.id, userId } });
  if (res.count === 0) throw new NotFoundError("That person isn't a member of this group.");
  await audit({ actorId: actor.id, action: "group.member.remove", entityType: "Group", entityId: group.id, metadata: { userId } });
  return group;
}
