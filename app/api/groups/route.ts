import { apiRoute } from "@/lib/api";
import { listGroups } from "@/services/groups";

/** GET /api/groups — all groups with member counts and the caller's membership. */
export const GET = apiRoute(async ({ actor }) => listGroups(actor));
