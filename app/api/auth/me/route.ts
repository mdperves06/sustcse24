import { apiRoute } from "@/lib/api";

/** GET /api/auth/me — the signed-in user's basic identity. */
export const GET = apiRoute(async ({ actor }) => ({
  id: actor.id,
  roll: actor.roll,
  role: actor.role,
  fullName: actor.fullName,
}));
