import { z } from "zod";
import { apiRoute, readJson } from "@/lib/api";
import { rejectAchievement, revokeAchievementReview, verifyAchievement } from "@/services/achievements";

const bodySchema = z.object({
  decision: z.enum(["verify", "reject", "revoke"]),
  reason: z.string().optional(),
});

/** POST /api/achievements/:id/review — { decision: "verify" | "reject" | "revoke", reason? } (achievements.verify). */
export const POST = apiRoute<{ id: string }>(async ({ req, params, actor }) => {
  const body = bodySchema.parse(await readJson(req));
  if (body.decision === "verify") await verifyAchievement(actor, params.id);
  else if (body.decision === "reject") await rejectAchievement(actor, params.id, { reason: body.reason ?? "" });
  else await revokeAchievementReview(actor, params.id);
  return { ok: true };
});
