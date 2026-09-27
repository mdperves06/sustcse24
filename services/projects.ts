import "server-only";
import { db } from "@/lib/db";
import { assertCan, can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { activeUserWhere, authorSelect, toAuthor, type Author } from "@/lib/selects";
import { deleteUpload, saveUpload, type SavedUpload } from "@/lib/uploads";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ProjectCategory } from "@/lib/generated/prisma/enums";
import { notifyUsers } from "@/services/notifications";
import {
  MAX_PROJECT_IMAGES,
  projectFiltersSchema,
  projectSchema,
  type ProjectFilters,
  type ProjectMemberInput,
} from "@/lib/validation/projects";

export const PROJECT_PAGE_SIZE = 12;
const LEAD_ROLE = "Lead";

export type ProjectMember = Author & { memberRole: string | null; isAuthor: boolean };

export type ProjectCard = {
  id: string;
  title: string;
  excerpt: string;
  category: ProjectCategory;
  technologies: string[];
  coverKey: string | null;
  likeCount: number;
  liked: boolean;
  bookmarked: boolean;
  members: ProjectMember[];
  author: Author;
  createdAt: Date;
};

export type ProjectDetail = Omit<ProjectCard, "excerpt"> & {
  description: string;
  githubUrl: string | null;
  demoUrl: string | null;
  images: { id: string; key: string; position: number }[];
  updatedAt: Date;
  canEdit: boolean;
  canDelete: boolean;
};

function cardSelect(viewerId: string) {
  return {
    id: true,
    title: true,
    description: true,
    category: true,
    technologies: true,
    createdAt: true,
    updatedAt: true,
    githubUrl: true,
    demoUrl: true,
    authorId: true,
    author: { select: authorSelect },
    images: { orderBy: { position: "asc" }, select: { id: true, fileKey: true, position: true } },
    members: { select: { role: true, userId: true, user: { select: authorSelect } } },
    likes: { where: { userId: viewerId }, select: { userId: true } },
    bookmarks: { where: { userId: viewerId }, select: { userId: true } },
    _count: { select: { likes: true } },
  } satisfies Prisma.ProjectSelect;
}

type ProjectRow = Prisma.ProjectGetPayload<{ select: ReturnType<typeof cardSelect> }>;

function excerptOf(text: string, max = 160) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

function membersOf(row: ProjectRow): ProjectMember[] {
  const members = row.members.map((m) => ({
    ...toAuthor(m.user),
    memberRole: m.role,
    isAuthor: m.userId === row.authorId,
  }));
  if (!members.some((m) => m.isAuthor)) {
    members.push({ ...toAuthor(row.author), memberRole: LEAD_ROLE, isAuthor: true });
  }
  // Author first, then by name.
  return members.sort((a, b) => Number(b.isAuthor) - Number(a.isAuthor) || a.name.localeCompare(b.name));
}

function toCard(row: ProjectRow): ProjectCard {
  return {
    id: row.id,
    title: row.title,
    excerpt: excerptOf(row.description),
    category: row.category,
    technologies: row.technologies,
    coverKey: row.images[0]?.fileKey ?? null,
    likeCount: row._count.likes,
    liked: row.likes.length > 0,
    bookmarked: row.bookmarks.length > 0,
    members: membersOf(row),
    author: toAuthor(row.author),
    createdAt: row.createdAt,
  };
}

function toDetail(row: ProjectRow, viewer: Viewer): ProjectDetail {
  const card = toCard(row);
  const isAuthor = row.authorId === viewer.id;
  return {
    id: card.id,
    title: card.title,
    category: card.category,
    technologies: card.technologies,
    coverKey: card.coverKey,
    likeCount: card.likeCount,
    liked: card.liked,
    bookmarked: card.bookmarked,
    members: card.members,
    author: card.author,
    createdAt: card.createdAt,
    description: row.description,
    githubUrl: row.githubUrl,
    demoUrl: row.demoUrl,
    images: row.images.map((i) => ({ id: i.id, key: i.fileKey, position: i.position })),
    updatedAt: row.updatedAt,
    canEdit: isAuthor,
    canDelete: isAuthor || can(viewer.role, "projects.manage"),
  };
}

/** Project ids whose technologies contain `tech` (case-insensitive). */
async function idsWithTech(tech: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM projects p
    WHERE p."deletedAt" IS NULL
      AND EXISTS (SELECT 1 FROM unnest(p.technologies) t WHERE lower(t) = lower(${tech}))`;
  return rows.map((r) => r.id);
}

export async function listProjects(viewer: Viewer, input: ProjectFilters | Record<string, unknown>) {
  const filters = projectFiltersSchema.parse(input);
  const and: Prisma.ProjectWhereInput[] = [{ deletedAt: null }];
  if (filters.category) and.push({ category: filters.category });
  if (filters.bookmarked) and.push({ bookmarks: { some: { userId: viewer.id } } });
  if (filters.tech) and.push({ id: { in: await idsWithTech(filters.tech) } });
  if (filters.q) {
    const q = filters.q;
    const techIds = await idsWithTech(q);
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { id: { in: techIds } },
      ],
    });
  }
  const where: Prisma.ProjectWhereInput = { AND: and };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    filters.sort === "liked" ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy,
      select: cardSelect(viewer.id),
      skip: (filters.page - 1) * PROJECT_PAGE_SIZE,
      take: PROJECT_PAGE_SIZE,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PROJECT_PAGE_SIZE)),
    projects: rows.map(toCard),
  };
}

/** Dashboard widget: newest projects. */
export async function listRecentProjects(viewer: Viewer, take = 4): Promise<ProjectCard[]> {
  const rows = await db.project.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take,
    select: cardSelect(viewer.id),
  });
  return rows.map(toCard);
}

/** Most-used technologies (for filter chips). */
export async function listPopularTechnologies(take = 16) {
  const rows = await db.$queryRaw<{ tech: string; n: bigint }[]>`
    SELECT min(t) AS tech, COUNT(*) AS n FROM (
      SELECT unnest(technologies) AS t FROM projects WHERE "deletedAt" IS NULL
    ) x GROUP BY lower(t) ORDER BY n DESC, tech ASC LIMIT ${take}`;
  return rows.map((r) => ({ tech: r.tech, count: Number(r.n) }));
}

export async function getProject(viewer: Viewer, id: string): Promise<ProjectDetail> {
  const row = await db.project.findFirst({ where: { id, deletedAt: null }, select: cardSelect(viewer.id) });
  if (!row) throw new NotFoundError("That project doesn't exist or was removed.");
  return toDetail(row, viewer);
}

/** Resolves team rolls to active users. Unknown/inactive rolls become a field error. */
async function resolveMembers(authorId: string, members: ProjectMemberInput[]) {
  const byRoll = new Map<string, string | null>();
  for (const m of members) {
    const roll = m.roll.trim().toUpperCase();
    if (roll && !byRoll.has(roll)) byRoll.set(roll, m.role);
  }
  const users = byRoll.size
    ? await db.user.findMany({
        where: {
          ...activeUserWhere,
          OR: [...byRoll.keys()].map((roll) => ({ roll: { equals: roll, mode: "insensitive" as const } })),
        },
        select: { id: true, roll: true },
      })
    : [];
  const found = new Map(users.map((u) => [u.roll.toUpperCase(), u.id]));
  const missing = [...byRoll.keys()].filter((r) => !found.has(r));
  if (missing.length) {
    throw new ValidationError("Some team members couldn't be found.", {
      members: [`No active batch member with roll ${missing.join(", ")}.`],
    });
  }
  const out = new Map<string, string | null>();
  for (const [roll, role] of byRoll) {
    const id = found.get(roll)!;
    if (id !== authorId) out.set(id, role);
  }
  return out;
}

async function saveScreenshots(files: File[]): Promise<SavedUpload[]> {
  const saved: SavedUpload[] = [];
  try {
    for (const file of files) saved.push(await saveUpload(file, "screenshot", "screenshots"));
  } catch (error) {
    await Promise.all(saved.map((s) => deleteUpload(s.key)));
    throw error;
  }
  return saved;
}

export async function createProject(actor: Viewer, input: unknown, screenshots: File[] = []) {
  const data = projectSchema.parse(input);
  if (screenshots.length > MAX_PROJECT_IMAGES) {
    throw new ValidationError(`Add at most ${MAX_PROJECT_IMAGES} screenshots.`, {
      screenshots: [`At most ${MAX_PROJECT_IMAGES} screenshots.`],
    });
  }
  await enforceRateLimit(`project:create:${actor.id}`, 10, 3600, "You've added a lot of projects — try again later.");
  const members = await resolveMembers(actor.id, data.members);
  const saved = await saveScreenshots(screenshots);

  try {
    return await db.project.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        technologies: data.technologies,
        githubUrl: data.githubUrl,
        demoUrl: data.demoUrl,
        authorId: actor.id,
        members: {
          create: [
            { userId: actor.id, role: LEAD_ROLE },
            ...[...members].map(([userId, role]) => ({ userId, role })),
          ],
        },
        images: { create: saved.map((s, position) => ({ fileKey: s.key, position })) },
      },
      select: { id: true },
    });
  } catch (error) {
    await Promise.all(saved.map((s) => deleteUpload(s.key)));
    throw error;
  }
}

/**
 * Only the author edits a project. `removeImageIds` deletes screenshots (and their files);
 * new screenshots are appended up to the limit.
 */
export async function updateProject(
  actor: Viewer,
  id: string,
  input: unknown,
  opts: { screenshots?: File[]; removeImageIds?: string[] } = {},
) {
  const project = await db.project.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, authorId: true, images: { select: { id: true, fileKey: true, position: true } } },
  });
  if (!project) throw new NotFoundError("That project doesn't exist or was removed.");
  if (project.authorId !== actor.id) throw new ForbiddenError("Only the project author can edit it.");

  const data = projectSchema.parse(input);
  const members = await resolveMembers(actor.id, data.members);
  const remove = project.images.filter((img) => opts.removeImageIds?.includes(img.id));
  const keep = project.images.filter((img) => !remove.includes(img));
  const incoming = opts.screenshots ?? [];
  if (keep.length + incoming.length > MAX_PROJECT_IMAGES) {
    throw new ValidationError(`A project can have at most ${MAX_PROJECT_IMAGES} screenshots.`, {
      screenshots: [`You can add ${Math.max(0, MAX_PROJECT_IMAGES - keep.length)} more.`],
    });
  }
  const saved = await saveScreenshots(incoming);
  const startAt = keep.reduce((max, img) => Math.max(max, img.position + 1), 0);

  try {
    await db.$transaction([
      db.project.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          technologies: data.technologies,
          githubUrl: data.githubUrl,
          demoUrl: data.demoUrl,
        },
      }),
      db.projectMember.deleteMany({ where: { projectId: id, userId: { not: actor.id } } }),
      db.projectMember.upsert({
        where: { projectId_userId: { projectId: id, userId: actor.id } },
        update: { role: LEAD_ROLE },
        create: { projectId: id, userId: actor.id, role: LEAD_ROLE },
      }),
      db.projectMember.createMany({
        data: [...members].map(([userId, role]) => ({ projectId: id, userId, role })),
        skipDuplicates: true,
      }),
      db.projectImage.deleteMany({ where: { projectId: id, id: { in: remove.map((r) => r.id) } } }),
      db.projectImage.createMany({
        data: saved.map((s, i) => ({ projectId: id, fileKey: s.key, position: startAt + i })),
      }),
    ]);
  } catch (error) {
    await Promise.all(saved.map((s) => deleteUpload(s.key)));
    throw error;
  }
  await Promise.all(remove.map((r) => deleteUpload(r.fileKey)));
}

export async function deleteProject(actor: Viewer, id: string) {
  const project = await db.project.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, authorId: true, title: true },
  });
  if (!project) throw new NotFoundError("That project doesn't exist or was removed.");
  const isAuthor = project.authorId === actor.id;
  if (!isAuthor) assertCan(actor, "projects.manage");
  await db.project.update({ where: { id }, data: { deletedAt: new Date() } });
  if (!isAuthor) {
    await audit({
      actorId: actor.id,
      action: "project.delete",
      entityType: "Project",
      entityId: id,
      metadata: { title: project.title },
    });
  }
}

async function requireLiveProject(id: string) {
  const project = await db.project.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, authorId: true, title: true },
  });
  if (!project) throw new NotFoundError("That project doesn't exist or was removed.");
  return project;
}

/** Likes or un-likes a project (idempotent). Notifies the author once per liker. */
export async function setProjectLike(viewer: Viewer, id: string, liked: boolean) {
  const project = await requireLiveProject(id);
  if (liked) {
    const res = await db.projectLike.createMany({ data: [{ projectId: id, userId: viewer.id }], skipDuplicates: true });
    if (res.count > 0) {
      const liker = await db.user.findUnique({ where: { id: viewer.id }, select: authorSelect });
      await notifyUsers([project.authorId], {
        type: "PROJECT_INTERACTION",
        title: `${liker?.profile?.fullName ?? "A batchmate"} liked your project`,
        body: project.title,
        link: `/projects/${id}`,
        actorId: viewer.id,
        dedupeKey: `project-like:${id}:${viewer.id}`,
      });
    }
  } else {
    await db.projectLike.deleteMany({ where: { projectId: id, userId: viewer.id } });
  }
  const likeCount = await db.projectLike.count({ where: { projectId: id } });
  return { liked, likeCount };
}

export async function toggleProjectLike(viewer: Viewer, id: string) {
  const existing = await db.projectLike.findUnique({
    where: { projectId_userId: { projectId: id, userId: viewer.id } },
    select: { projectId: true },
  });
  return setProjectLike(viewer, id, !existing);
}

export async function setProjectBookmark(viewer: Viewer, id: string, bookmarked: boolean) {
  await requireLiveProject(id);
  if (bookmarked) {
    await db.projectBookmark.createMany({ data: [{ projectId: id, userId: viewer.id }], skipDuplicates: true });
  } else {
    await db.projectBookmark.deleteMany({ where: { projectId: id, userId: viewer.id } });
  }
  return { bookmarked };
}

export async function getProjectStats() {
  const [projects, likes, contributors] = await Promise.all([
    db.project.count({ where: { deletedAt: null } }),
    db.projectLike.count({ where: { project: { deletedAt: null } } }),
    db.projectMember.findMany({
      where: { project: { deletedAt: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);
  return { projects, likes, contributors: contributors.length };
}
