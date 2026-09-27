import "server-only";
import { db } from "@/lib/db";
import { activeUserWhere, authorSelect, toAuthor } from "@/lib/selects";
import { studentCardSelect, toStudentCard } from "@/services/directory";
import type { Viewer } from "@/lib/privacy";

export function countMembers() {
  return db.user.count({ where: activeUserWhere });
}

/** Recently joined or updated profiles (identity + shared card fields only). */
export async function recentlyUpdatedProfiles(viewer: Viewer, take = 6) {
  const rows = await db.user.findMany({
    where: { ...activeUserWhere, profile: { isNot: null }, id: { not: viewer.id } },
    orderBy: { profile: { updatedAt: "desc" } },
    take,
    select: { ...studentCardSelect, createdAt: true, profile: { select: { ...studentCardSelect.profile.select, updatedAt: true } } },
  });
  return rows.map((r) => ({ ...toStudentCard(r, viewer), updatedAt: r.profile?.updatedAt ?? r.createdAt, joinedAt: r.createdAt }));
}

/** Latest main-feed activity for the dashboard. */
export async function communityActivity(take = 5) {
  const posts = await db.post.findMany({
    where: { deletedAt: null, removedAt: null, groupId: null, author: activeUserWhere },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      author: { select: authorSelect },
      _count: { select: { comments: { where: { deletedAt: null, removedAt: null } }, reactions: true } },
    },
  });
  return posts.map((p) => ({ ...p, author: toAuthor(p.author) }));
}
