import { apiRoute } from "@/lib/api";
import { listPolls } from "@/services/polls";

/** GET /api/polls — results are only included when the caller may see them; voter identities never for anonymous polls. */
export const GET = apiRoute(async ({ actor }) => listPolls(actor));
