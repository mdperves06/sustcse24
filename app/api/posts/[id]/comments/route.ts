import { apiRoute, readJson } from "@/lib/api";
import { addComment, listComments } from "@/services/posts";

/** GET /api/posts/:id/comments */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => listComments(actor, params.id));

/** POST /api/posts/:id/comments — { content } */
export const POST = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  return addComment(actor, params.id, await readJson(req));
});
