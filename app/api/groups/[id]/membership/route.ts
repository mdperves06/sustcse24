import { apiRoute } from "@/lib/api";
import { joinGroup, leaveGroup } from "@/services/groups";

/** POST /api/groups/:id/membership — join the group. */
export const POST = apiRoute<{ id: string }>(async ({ params, actor }) => {
  const g = await joinGroup(actor, params.id);
  return { groupId: g.id, joined: true };
});

/** DELETE /api/groups/:id/membership — leave the group. */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  const g = await leaveGroup(actor, params.id);
  return { groupId: g.id, joined: false };
});
