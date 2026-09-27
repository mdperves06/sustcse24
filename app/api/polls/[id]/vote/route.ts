import { apiRoute, readJson } from "@/lib/api";
import { getPoll, vote } from "@/services/polls";

/** POST /api/polls/:id/vote — { optionIds: string[] }. One ballot per member; returns the poll with results. */
export const POST = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await vote(actor, params.id, await readJson(req));
  return getPoll(actor, params.id);
});
