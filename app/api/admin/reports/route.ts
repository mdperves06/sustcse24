import { apiRoute, searchParamsObject } from "@/lib/api";
import { listReports } from "@/services/moderation";

/** GET /api/admin/reports?status=PENDING|RESOLVED|DISMISSED&page= */
export const GET = apiRoute(async ({ req, actor }) => listReports(actor, searchParamsObject(req)));
