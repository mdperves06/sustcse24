import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { eventFiltersSchema } from "@/lib/validation/events";
import { createEvent, getEvent, listEvents } from "@/services/events";

/** GET /api/events?tab=upcoming|past&type=&page= */
export const GET = apiRoute(async ({ req, actor }) => {
  const filters = eventFiltersSchema.parse(searchParamsObject(req));
  return listEvents(actor, filters);
});

/**
 * POST /api/events — JSON create (events.manage). Dates accept `YYYY-MM-DDTHH:mm`
 * (Dhaka time) or full ISO-8601 strings. Cover images are uploaded via the web form.
 */
export const POST = apiRoute(async ({ req, actor }) => {
  const row = await createEvent(actor, await readJson(req));
  return getEvent(actor, row.id);
});
