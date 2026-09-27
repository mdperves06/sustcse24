import { apiRoute, readJson } from "@/lib/api";
import { toggleReaction } from "@/services/posts";

/** POST /api/posts/:id/reactions — { type }. Same type again removes it; a different type switches. Returns the new summary. */
export const POST = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  return toggleReaction(actor, params.id, await readJson(req));
});
