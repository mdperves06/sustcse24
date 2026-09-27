import { apiRoute, readJson } from "@/lib/api";
import { ForbiddenError } from "@/lib/errors";
import { getProfileById, getProfileByIdOrRoll, updateOwnProfile } from "@/services/profiles";

/** GET /api/students/:id — accepts a user id or a roll. Only fields the owner shares are returned. */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => {
  return getProfileByIdOrRoll(actor, params.id);
});

/** PATCH /api/students/:id — students may only update their own profile (full profile payload). */
export const PATCH = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  if (params.id !== actor.id && params.id !== actor.roll) {
    throw new ForbiddenError("You can only edit your own profile.");
  }
  await updateOwnProfile(actor, await readJson(req));
  return getProfileById(actor, actor.id);
});
