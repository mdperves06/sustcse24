import { apiRoute, searchParamsObject } from "@/lib/api";
import { directoryFiltersSchema, searchDirectory } from "@/services/directory";

/** GET /api/students?q=&skill=&location=&company=&interest=&status=&sort=&page= — privacy-filtered directory. */
export const GET = apiRoute(async ({ req, actor }) => {
  const filters = directoryFiltersSchema.parse(searchParamsObject(req));
  return searchDirectory(actor, filters);
});
