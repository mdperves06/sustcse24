import { apiRoute, searchParamsObject } from "@/lib/api";
import { calendarRangeSchema } from "@/lib/validation/calendar";
import { getCalendarItems } from "@/services/calendar";

/** GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — merged calendar items (Dhaka days, inclusive, ≤ 120 days). */
export const GET = apiRoute(async ({ req, actor }) => {
  const { from, to } = calendarRangeSchema.parse(searchParamsObject(req));
  return getCalendarItems(actor, from, to);
});
