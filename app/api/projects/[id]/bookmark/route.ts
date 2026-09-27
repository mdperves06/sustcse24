import { apiRoute } from "@/lib/api";
import { setProjectBookmark } from "@/services/projects";

/** POST /api/projects/:id/bookmark */
export const POST = apiRoute<{ id: string }>(async ({ params, actor }) => setProjectBookmark(actor, params.id, true));

/** DELETE /api/projects/:id/bookmark */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => setProjectBookmark(actor, params.id, false));
