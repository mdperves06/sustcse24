import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/privacy";
import { authorSelect, toAuthor } from "@/lib/selects";
import { searchDirectory } from "@/services/directory";

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  type: z.enum(["all", "students", "posts", "projects", "opportunities", "resources", "events", "announcements"]).default("all").catch("all"),
});

const PER_SECTION = 6;

/**
 * Global search. Every section reuses the same visibility rules as its own page:
 * students go through the privacy-aware directory; content excludes deleted/removed rows.
 */
export async function globalSearch(viewer: Viewer, rawQuery: string, type: z.infer<typeof searchQuerySchema>["type"] = "all") {
  const q = rawQuery.trim();
  if (q.length < 2) return null;
  const take = type === "all" ? PER_SECTION : 30;
  const want = (t: string) => type === "all" || type === t;
  const contains = { contains: q, mode: "insensitive" as const };

  const [students, posts, projects, opportunities, resources, events, announcements] = await Promise.all([
    want("students") ? searchDirectory(viewer, { q, sort: "name", page: 1 }) : null,
    want("posts")
      ? db.post.findMany({
          where: { deletedAt: null, removedAt: null, content: contains, group: { is: null } },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, content: true, type: true, createdAt: true, author: { select: authorSelect } },
        })
      : [],
    want("projects")
      ? db.project.findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { description: contains }, { technologies: { has: q } }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, title: true, description: true, category: true, technologies: true },
        })
      : [],
    want("opportunities")
      ? db.opportunity.findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { organization: contains }, { description: contains }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, title: true, organization: true, type: true, deadline: true },
        })
      : [],
    want("resources")
      ? db.resource.findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { course: contains }, { description: contains }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, title: true, course: true, category: true },
        })
      : [],
    want("events")
      ? db.event.findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { description: contains }, { location: contains }] },
          orderBy: { startsAt: "desc" },
          take,
          select: { id: true, title: true, startsAt: true, location: true, type: true },
        })
      : [],
    want("announcements")
      ? db.announcement.findMany({
          where: { deletedAt: null, OR: [{ title: contains }, { body: contains }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, title: true, category: true, createdAt: true },
        })
      : [],
  ]);

  return {
    q,
    students: students?.students.slice(0, take) ?? [],
    studentTotal: students?.total ?? 0,
    posts: posts.map((p) => ({ ...p, author: toAuthor(p.author) })),
    projects,
    opportunities,
    resources,
    events,
    announcements,
  };
}
