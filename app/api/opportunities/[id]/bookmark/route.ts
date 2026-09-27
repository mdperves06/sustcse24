import { apiRoute } from "@/lib/api";
import { setOpportunityBookmark } from "@/services/opportunities";

/** POST /api/opportunities/:id/bookmark — save for later. */
export const POST = apiRoute<{ id: string }>(async ({ params, actor }) => setOpportunityBookmark(actor, params.id, true));

/** DELETE /api/opportunities/:id/bookmark — remove from saved. */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) =>
  setOpportunityBookmark(actor, params.id, false),
);
