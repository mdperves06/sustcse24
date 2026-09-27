import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { feedFiltersSchema } from "@/lib/validation/posts";
import { createPost, getPost, listPosts } from "@/services/posts";

/** GET /api/posts?page=&type=&q= — main batch feed (group posts are listed under their group). */
export const GET = apiRoute(async ({ req, actor }) => {
  return listPosts(actor, feedFiltersSchema.parse(searchParamsObject(req)));
});

/** POST /api/posts — JSON { type?, content, linkUrl? }. Image uploads are only available through the web form. */
export const POST = apiRoute(async ({ req, actor }) => {
  const post = await createPost(actor, await readJson(req));
  return getPost(actor, post.id);
});
