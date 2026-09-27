import "server-only";
import { db } from "@/lib/db";
import { activeUserWhere } from "@/lib/selects";

/**
 * The only data exposed to anonymous visitors: aggregate counts. No names,
 * rolls, photos or any per-student information ever leave this function.
 */
export async function getPublicStats() {
  const [students, projects, skills, opportunities] = await Promise.all([
    db.user.count({ where: { ...activeUserWhere, isDemo: false } }).then(async (real) =>
      // In a fresh dev environment only demo accounts exist; show those so the page isn't empty.
      real > 0 ? real : db.user.count({ where: activeUserWhere }),
    ),
    db.project.count({ where: { deletedAt: null } }),
    db.skill.count({ where: { profiles: { some: { user: activeUserWhere } } } }),
    db.opportunity.count({ where: { deletedAt: null } }),
  ]);
  return { students, projects, skills, opportunities };
}
