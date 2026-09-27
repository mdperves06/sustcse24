import { apiRoute, searchParamsObject } from "@/lib/api";
import { globalSearch, searchQuerySchema } from "@/services/search";

/** GET /api/search?q=&type= — categorized search results. */
export const GET = apiRoute(async ({ req, actor }) => {
  const { q, type } = searchQuerySchema.parse(searchParamsObject(req));
  return (await globalSearch(actor, q ?? "", type)) ?? { q: q ?? "", message: "Enter at least 2 characters." };
});
