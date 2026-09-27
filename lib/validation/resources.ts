import { z } from "zod";
import { optionalText, optionalUrl, pageSchema, requiredText } from "@/lib/validation/common";

export const RESOURCE_CATEGORIES = [
  "COURSE",
  "NOTES",
  "SLIDES",
  "PREVIOUS_QUESTIONS",
  "LAB",
  "ASSIGNMENT",
  "TUTORIAL",
  "LINK",
] as const;

/** Normalises course codes: "cse331" / "cse  331" → "CSE 331". */
export function normalizeCourse(raw: string): string {
  const v = raw.trim().replace(/\s+/g, " ");
  const m = /^([a-z]{2,5})\s?-?\s?(\d{3,4}[a-z]?)$/i.exec(v);
  return m ? `${m[1]!.toUpperCase()} ${m[2]!.toUpperCase()}` : v;
}

export const resourceSchema = z.object({
  title: requiredText(160, "Title"),
  description: optionalText(2000),
  course: requiredText(60, "Course").transform(normalizeCourse),
  category: z.enum(RESOURCE_CATEGORIES, "Choose a category."),
  url: optionalUrl,
});

export type ResourceInput = z.infer<typeof resourceSchema>;

export const resourceFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z.enum(RESOURCE_CATEGORIES).optional().catch(undefined),
  course: z.string().trim().max(60).optional().catch(undefined),
  sort: z.enum(["newest", "downloads"]).default("newest").catch("newest"),
  page: pageSchema.default(1),
});

export type ResourceFilters = z.infer<typeof resourceFiltersSchema>;
