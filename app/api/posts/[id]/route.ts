import { apiRoute, readJson } from "@/lib/api";
import { deletePost, getPost, updatePost } from "@/services/posts";

/** GET /api/posts/:id */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => getPost(actor, params.id));

/** PATCH /api/posts/:id — author only: { type?, content, linkUrl? }. */
export const PATCH = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await updatePost(actor, params.id, await readJson(req));
  return getPost(actor, params.id);
});

/** DELETE /api/posts/:id — author or staff (soft delete). */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  await deletePost(actor, params.id);
  return { deleted: true };
});
