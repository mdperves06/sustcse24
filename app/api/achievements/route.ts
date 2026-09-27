import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { listVerifiedAchievements, submitAchievement } from "@/services/achievements";

/** GET /api/achievements?category= — verified Hall of Fame entries only. */
export const GET = apiRoute(async ({ req }) => listVerifiedAchievements(searchParamsObject(req)));

/** POST /api/achievements — JSON { title, category, description?, achievedOn? (YYYY-MM-DD), link? } → PENDING. */
export const POST = apiRoute(async ({ req, actor }) => submitAchievement(actor, await readJson(req)));
