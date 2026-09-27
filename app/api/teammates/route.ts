import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { createTeammateRequest, findMatchingStudents, listTeammateRequests } from "@/services/teammates";
import { teammateFiltersSchema } from "@/lib/validation/teammates";

/** GET /api/teammates?skills=ai,react&q=&closed=1&mine=1 — requests plus students matching the skills. */
export const GET = apiRoute(async ({ req, actor }) => {
  const filters = teammateFiltersSchema.parse(searchParamsObject(req));
  const [requests, matchingStudents] = await Promise.all([
    listTeammateRequests(actor, filters),
    findMatchingStudents(actor, filters.skills),
  ]);
  return { requests, matchingStudents };
});

/** POST /api/teammates — JSON { title, description, requiredSkills: string[], teammatesNeeded, deadline?, contactPreference } */
export const POST = apiRoute(async ({ req, actor }) => createTeammateRequest(actor, await readJson(req)));
