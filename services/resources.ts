import "server-only";
import { db } from "@/lib/db";
import { assertCan, can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { fileUrl } from "@/lib/files";
import { enforceRateLimit } from "@/lib/rate-limit";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import { getSetting } from "@/lib/settings";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ResourceCategory } from "@/lib/generated/prisma/enums";
import { resourceFiltersSchema, resourceSchema, type ResourceFilters } from "@/lib/validation/resources";

export const RESOURCE_PAGE_SIZE = 18;

export type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  course: string;
  category: ResourceCategory;
  kind: "file" | "link";
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  /** External host for links (e.g. "drive.google.com"). */
  host: string | null;
  downloads: number;
  createdAt: Date;
  uploadedBy: Author;
  canDelete: boolean;
};

const resourceSelect = {
  id: true,
  title: true,
  description: true,
  course: true,
  category: true,
  fileKey: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  url: true,
  downloads: true,
  createdAt: true,
  uploadedById: true,
  uploadedBy: { select: authorSelect },
} satisfies Prisma.ResourceSelect;

type ResourceRow = Prisma.ResourceGetPayload<{ select: typeof resourceSelect }>;

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toItem(row: ResourceRow, viewer: Viewer): ResourceItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    course: row.course,
    category: row.category,
    kind: row.fileKey ? "file" : "link",
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    host: row.fileKey ? null : hostOf(row.url),
    downloads: row.downloads,
    createdAt: row.createdAt,
    uploadedBy: toAuthor(row.uploadedBy),
    canDelete: row.uploadedById === viewer.id || can(viewer.role, "resources.manage"),
  };
}

/** Whether the viewer may share resources right now (depends on an admin setting). */
export async function canShareResources(viewer: Viewer): Promise<boolean> {
  if (can(viewer.role, "resources.manage")) return true;
  return getSetting("studentResourceUploads");
}

export async function listResources(viewer: Viewer, input: ResourceFilters | Record<string, unknown>) {
  const filters = resourceFiltersSchema.parse(input);
  const and: Prisma.ResourceWhereInput[] = [{ deletedAt: null }];
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { course: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.category) and.push({ category: filters.category });
  if (filters.course) and.push({ course: { equals: filters.course, mode: "insensitive" } });

  const where: Prisma.ResourceWhereInput = { AND: and };
  const orderBy: Prisma.ResourceOrderByWithRelationInput[] =
    filters.sort === "downloads" ? [{ downloads: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    db.resource.count({ where }),
    db.resource.findMany({
      where,
      orderBy,
      select: resourceSelect,
      skip: (filters.page - 1) * RESOURCE_PAGE_SIZE,
      take: RESOURCE_PAGE_SIZE,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / RESOURCE_PAGE_SIZE)),
    resources: rows.map((r) => toItem(r, viewer)),
  };
}

/** Distinct course codes for the filter dropdown, with resource counts. */
export async function listResourceCourses() {
  const rows = await db.resource.groupBy({
    by: ["course"],
    where: { deletedAt: null },
    _count: { _all: true },
    orderBy: { course: "asc" },
  });
  return rows.map((r) => ({ course: r.course, count: r._count._all }));
}

export async function getResourceStats() {
  const [total, downloads, byCategory] = await Promise.all([
    db.resource.count({ where: { deletedAt: null } }),
    db.resource.aggregate({ where: { deletedAt: null }, _sum: { downloads: true } }),
    db.resource.groupBy({ by: ["category"], where: { deletedAt: null }, _count: { _all: true } }),
  ]);
  return {
    total,
    downloads: downloads._sum.downloads ?? 0,
    byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count._all])) as Partial<
      Record<ResourceCategory, number>
    >,
  };
}

/**
 * Shares a resource: exactly one of `file` (uploaded) or `url` (external link).
 * Students can only share while the admin setting allows it.
 */
export async function createResource(actor: Viewer, input: unknown, file: File | null) {
  if (!(await canShareResources(actor))) {
    throw new ForbiddenError("Resource sharing is currently limited to admins.");
  }
  const data = resourceSchema.parse(input);
  if (file && data.url) {
    throw new ValidationError("Upload a file or add a link — not both.", {
      url: ["Remove the link or the file."],
    });
  }
  if (!file && !data.url) {
    throw new ValidationError("Upload a file or add a link.", {
      file: ["Choose a file, or paste a link below."],
      url: ["Paste a link, or choose a file above."],
    });
  }
  await enforceRateLimit(`resource:create:${actor.id}`, 20, 3600, "You've shared a lot of resources — try again later.");

  const saved = file ? await saveUpload(file, "resource", "file") : null;
  try {
    return await db.resource.create({
      data: {
        title: data.title,
        description: data.description,
        course: data.course,
        category: data.category,
        uploadedById: actor.id,
        fileKey: saved?.key ?? null,
        fileName: saved?.fileName ?? null,
        fileSize: saved?.size ?? null,
        mimeType: saved?.mime ?? null,
        url: saved ? null : data.url,
      },
      select: { id: true },
    });
  } catch (error) {
    await deleteUpload(saved?.key);
    throw error;
  }
}

/** Soft-deletes a resource (uploader or staff). The file route stops serving it immediately. */
export async function deleteResource(actor: Viewer, id: string) {
  const row = await db.resource.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, uploadedById: true, title: true, fileKey: true },
  });
  if (!row) throw new NotFoundError("That resource no longer exists.");
  const isOwner = row.uploadedById === actor.id;
  if (!isOwner) assertCan(actor, "resources.manage");

  await db.resource.update({ where: { id }, data: { deletedAt: new Date() } });
  if (!isOwner) {
    await audit({
      actorId: actor.id,
      action: "resource.delete",
      entityType: "Resource",
      entityId: id,
      metadata: { title: row.title },
    });
  }
}

/** Counts a download and returns where to send the browser (file route or external link). */
export async function recordResourceDownload(id: string): Promise<string> {
  const row = await db.resource.findFirst({ where: { id, deletedAt: null }, select: { fileKey: true, url: true } });
  if (!row) throw new NotFoundError("That resource no longer exists.");
  const target = row.fileKey ? fileUrl(row.fileKey) : row.url;
  if (!target) throw new NotFoundError("This resource has no file or link.");
  await db.resource.update({ where: { id }, data: { downloads: { increment: 1 } } });
  return target;
}
