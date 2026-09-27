import { apiRoute, readJson } from "@/lib/api";
import { deleteOpportunity, getOpportunity, updateOpportunity } from "@/services/opportunities";

/** GET /api/opportunities/:id */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => getOpportunity(actor, params.id));

/** PATCH /api/opportunities/:id — poster or opportunities.manage; full JSON payload. */
export const PATCH = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await updateOpportunity(actor, params.id, await readJson(req));
  return getOpportunity(actor, params.id);
});

/** DELETE /api/opportunities/:id — poster or opportunities.manage (soft delete). */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  await deleteOpportunity(actor, params.id);
  return { deleted: true };
});
