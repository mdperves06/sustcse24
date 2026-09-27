import { apiRoute } from "@/lib/api";
import { deleteOwnAchievement } from "@/services/achievements";

/** DELETE /api/achievements/:id — owner withdraws a PENDING submission. */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  await deleteOwnAchievement(actor, params.id);
  return { deleted: true };
});
