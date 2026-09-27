import { apiRoute, readJson } from "@/lib/api";
import { applyUserPatch, getStudentDetail } from "@/services/admin-users";

/** GET /api/admin/users/:id */
export const GET = apiRoute<{ id: string }>(async ({ params, actor }) => getStudentDetail(actor, params.id));

/**
 * PATCH /api/admin/users/:id — `{ action: "update" | "setRole" | "setStatus" | "resetPassword" | "delete"
 * | "restore" | "unlock" | "verify" | "restrict", ... }`. Returns the updated account.
 */
export const PATCH = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  await applyUserPatch(actor, params.id, await readJson(req));
  return getStudentDetail(actor, params.id);
});
