import { z } from "zod";
import { optionalDate, requiredText, tagList } from "@/lib/validation/common";
import { queryFlag } from "@/lib/validation/opportunities";

export const CONTACT_PREFERENCES = ["IN_APP", "EMAIL", "PHONE", "FACEBOOK", "LINKEDIN"] as const;

export const teammateRequestSchema = z.object({
  title: requiredText(160, "Project idea"),
  description: requiredText(3000, "Description"),
  requiredSkills: tagList(12, 40)
    .transform((tags) => tags.map((t) => t.toLowerCase()))
    .refine((t) => t.length > 0, "Add at least one skill."),
  teammatesNeeded: z.coerce
    .number("Enter a number.")
    .int("Enter a whole number.")
    .min(1, "At least 1 teammate.")
    .max(10, "At most 10 teammates."),
  deadline: optionalDate.refine((d) => !d || d.getTime() > Date.now(), "The deadline must be in the future."),
  contactPreference: z.enum(CONTACT_PREFERENCES, "Choose how people should contact you."),
});

export type TeammateRequestInput = z.infer<typeof teammateRequestSchema>;

/** "ai, React" → ["ai", "react"] */
const skillsParam = z
  .union([z.string().max(300), z.array(z.string().max(40)).max(8)])
  .optional()
  .catch(undefined)
  .transform((v) => {
    const raw = Array.isArray(v) ? v : (v ?? "").split(",");
    return [...new Set(raw.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  });

export const teammateFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  skills: skillsParam,
  closed: queryFlag,
  mine: queryFlag,
});

export type TeammateFilters = z.infer<typeof teammateFiltersSchema>;
