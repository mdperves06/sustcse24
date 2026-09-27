import { apiRoute } from "@/lib/api";
import { deleteProject, getProject } from "@/services/projects";

/** GET /api/projects/:id */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => getProject(actor, params.id));

/** DELETE /api/projects/:id — author, or staff with projects.manage (soft delete). */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  await deleteProject(actor, params.id);
  return { deleted: true };
});
