import { apiRoute } from "@/lib/api";
import { getEvent } from "@/services/events";

/** GET /api/events/:id — details, RSVP counts, going list and the caller's RSVP. */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => {
  return getEvent(actor, params.id);
});
