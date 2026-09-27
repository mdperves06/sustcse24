import { apiRoute, readJson } from "@/lib/api";
import { getReport, reviewReport } from "@/services/moderation";

/** GET /api/admin/reports/:id */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => getReport(actor, params.id));

/** PATCH /api/admin/reports/:id — { decision: "remove" | "resolve" | "dismiss", note? } */
export const PATCH = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await reviewReport(actor, params.id, await readJson(req));
  return getReport(actor, params.id);
});
