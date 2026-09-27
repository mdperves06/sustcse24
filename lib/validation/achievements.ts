import { z } from "zod";
import { optionalDateOnly, optionalText, optionalUrl, requiredText } from "@/lib/validation/common";

export const ACHIEVEMENT_CATEGORIES = [
  "HACKATHON",
  "MUN",
  "RESEARCH",
  "SCHOLARSHIP",
  "CERTIFICATION",
  "COMPETITION",
  "JOB",
  "STARTUP",
  "OTHER",
] as const;

export const achievementSchema = z.object({
  title: requiredText(160, "Title"),
  description: optionalText(3000),
  category: z.enum(ACHIEVEMENT_CATEGORIES, "Choose a category."),
  achievedOn: optionalDateOnly.refine(
    (d) => !d || d.getTime() <= Date.now() + 86_400_000,
    "The date can't be in the future.",
  ),
  link: optionalUrl,
});

export type AchievementInput = z.infer<typeof achievementSchema>;

export const rejectAchievementSchema = z.object({
  reason: requiredText(500, "A reason"),
});

export const achievementFiltersSchema = z.object({
  category: z.enum(ACHIEVEMENT_CATEGORIES).optional().catch(undefined),
});
