import { apiRoute, readJson } from "@/lib/api";
import { getEvent, setRsvp } from "@/services/events";

/** POST /api/events/:id/rsvp { status: "GOING" | "MAYBE" | "NOT_GOING" } */
export const POST = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await setRsvp(actor, params.id, await readJson(req));
  const event = await getEvent(actor, params.id);
  return { status: event.viewerStatus, counts: event.counts };
});
