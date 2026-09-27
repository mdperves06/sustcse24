import { apiRoute, searchParamsObject } from "@/lib/api";
import { announcementFiltersSchema } from "@/lib/validation/announcements";
import { listAnnouncements } from "@/services/announcements";

/** GET /api/announcements?q=&category=&view=active|archived&page= */
export const GET = apiRoute(async ({ req, actor }) => {
  const filters = announcementFiltersSchema.parse(searchParamsObject(req));
  return listAnnouncements(actor, filters);
});
