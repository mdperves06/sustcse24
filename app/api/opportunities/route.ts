import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { createOpportunity, getOpportunity, listOpportunities } from "@/services/opportunities";

/** GET /api/opportunities?q=&type=&saved=1&expired=1&sort=newest|deadline&page= */
export const GET = apiRoute(async ({ req, actor }) => {
  return listOpportunities(actor, searchParamsObject(req));
});

/** POST /api/opportunities — JSON { title, organization, description, type, location?, deadline?, applyUrl? } */
export const POST = apiRoute(async ({ req, actor }) => {
  const created = await createOpportunity(actor, await readJson(req));
  return getOpportunity(actor, created.id);
});
