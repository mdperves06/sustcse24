import { z } from "zod";
import { optionalUrl, pageSchema, requiredText, tagList } from "@/lib/validation/common";
import { queryFlag } from "@/lib/validation/opportunities";

export const PROJECT_CATEGORIES = [
  "WEB",
  "MOBILE",
  "AI_ML",
  "CYBER_SECURITY",
  "IOT",
  "ROBOTICS",
  "DATA_SCIENCE",
  "OTHER",
] as const;

export const MAX_PROJECT_IMAGES = 6;
export const MAX_PROJECT_MEMBERS = 12;

const memberSchema = z.object({
  roll: z.string().trim().min(1).max(20),
  role: z
    .string()
    .trim()
    .max(40, "Use at most 40 characters.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type ProjectMemberInput = z.infer<typeof memberSchema>;

/**
 * Members arrive either as a JSON array (from the picker / REST API) or as a
 * comma-separated roll list ("D24001, D24002:Designer").
 */
const membersField = z
  .union([z.string(), z.array(memberSchema)])
  .optional()
  .transform((v, ctx): ProjectMemberInput[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const raw = v.trim();
    if (!raw) return [];
    if (raw.startsWith("[")) {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }
      const parsed = z.array(memberSchema).safeParse(json);
      if (parsed.success) return parsed.data;
      ctx.addIssue({ code: "custom", message: "Team members are invalid." });
      return z.NEVER;
    }
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [roll, ...role] = part.split(":");
        return { roll: (roll ?? "").trim(), role: role.join(":").trim().slice(0, 40) || null };
      });
  })
  .refine((m) => m.length <= MAX_PROJECT_MEMBERS, `At most ${MAX_PROJECT_MEMBERS} team members.`);

export const projectSchema = z.object({
  title: requiredText(120, "Title"),
  description: requiredText(8000, "Description"),
  category: z.enum(PROJECT_CATEGORIES, "Choose a category."),
  technologies: tagList(15, 30),
  githubUrl: optionalUrl,
  demoUrl: optionalUrl,
  members: membersField,
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  tech: z.string().trim().max(40).optional().catch(undefined),
  category: z.enum(PROJECT_CATEGORIES).optional().catch(undefined),
  sort: z.enum(["newest", "liked"]).default("newest").catch("newest"),
  bookmarked: queryFlag,
  page: pageSchema.default(1),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;
