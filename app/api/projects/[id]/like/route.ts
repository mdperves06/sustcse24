import { apiRoute } from "@/lib/api";
import { toggleProjectLike } from "@/services/projects";

/** POST /api/projects/:id/like — toggles the viewer's like. Returns { liked, likeCount }. */
export const POST = apiRoute<{ id: string }>(async ({ params, actor }) => toggleProjectLike(actor, params.id));
