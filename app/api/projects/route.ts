import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { createProject, getProject, listProjects } from "@/services/projects";

/** GET /api/projects?q=&tech=&category=&sort=newest|liked&bookmarked=1&page= */
export const GET = apiRoute(async ({ req, actor }) => {
  return listProjects(actor, searchParamsObject(req));
});

/**
 * POST /api/projects — JSON (no screenshots; add those from the web form):
 * { title, description, category, technologies: string[], githubUrl?, demoUrl?, members?: [{ roll, role? }] }
 */
export const POST = apiRoute(async ({ req, actor }) => {
  const created = await createProject(actor, await readJson(req));
  return getProject(actor, created.id);
});
