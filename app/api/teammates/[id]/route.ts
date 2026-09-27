import { z } from "zod";
import { apiRoute, readJson } from "@/lib/api";
import { deleteTeammateRequest, setTeammateRequestStatus } from "@/services/teammates";

/** PATCH /api/teammates/:id — { status: "OPEN" | "CLOSED" } (author only). */
export const PATCH = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  const { status } = z.object({ status: z.enum(["OPEN", "CLOSED"]) }).parse(await readJson(req));
  await setTeammateRequestStatus(actor, params.id, status);
  return { status };
});

/** DELETE /api/teammates/:id — author, or moderators (soft delete). */
export const DELETE = apiRoute<{ id: string }>(async ({ params, actor }) => {
  await deleteTeammateRequest(actor, params.id);
  return { deleted: true };
});
