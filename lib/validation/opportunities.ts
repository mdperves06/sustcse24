import { z } from "zod";
import { optionalText, optionalUrl, pageSchema, requiredText } from "@/lib/validation/common";
import { parseLocalInput } from "@/lib/time";

/**
 * Deadline from a date (or datetime-local) input, Dhaka time. A date without a time
 * means "until the end of that day", so "Due today" stays open all day.
 */
export const deadlineField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
    const d = parseLocalInput(dateOnly ? `${v}T23:59:59` : v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

export const OPPORTUNITY_TYPES = [
  "INTERNSHIP",
  "JOB",
  "HACKATHON",
  "SCHOLARSHIP",
  "COMPETITION",
  "RESEARCH",
  "FREELANCING",
] as const;

export const opportunitySchema = z.object({
  title: requiredText(160, "Title"),
  organization: requiredText(120, "Organization"),
  description: requiredText(5000, "Description"),
  type: z.enum(OPPORTUNITY_TYPES, "Choose a type."),
  location: optionalText(120),
  deadline: deadlineField,
  applyUrl: optionalUrl,
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;

/** Query-string boolean: "1" / "true" / "on" (also accepts an already-parsed boolean). */
export const queryFlag = z
  .union([z.boolean(), z.literal("1"), z.literal("true"), z.literal("on")])
  .optional()
  .catch(undefined)
  .transform((v) => v === true || v === "1" || v === "true" || v === "on");

export const opportunityFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  type: z.enum(OPPORTUNITY_TYPES).optional().catch(undefined),
  saved: queryFlag,
  expired: queryFlag,
  sort: z.enum(["newest", "deadline"]).default("newest").catch("newest"),
  page: pageSchema.default(1),
});

export type OpportunityFilters = z.infer<typeof opportunityFiltersSchema>;
