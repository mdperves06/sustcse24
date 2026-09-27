import { apiRoute } from "@/lib/api";
import { getAnnouncement } from "@/services/announcements";

/** GET /api/announcements/:id */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => {
  return getAnnouncement(actor, params.id);
});
