import { apiRoute, readJson } from "@/lib/api";
import { reportPost } from "@/services/posts";

/** POST /api/posts/:id/report — { reason: "Spam" | "Harassment" | "Inappropriate" | "Misinformation" | "Other", details? } */
export const POST = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await reportPost(actor, params.id, await readJson(req));
  return { reported: true };
});
