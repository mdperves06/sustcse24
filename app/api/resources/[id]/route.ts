import { apiRoute } from "@/lib/api";
import { deleteResource } from "@/services/resources";

/** DELETE /api/resources/:id — uploader or staff with resources.manage (soft delete). */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  await deleteResource(actor, params.id);
  return { deleted: true };
});
