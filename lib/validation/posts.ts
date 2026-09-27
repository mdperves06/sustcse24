import { z } from "zod";
import { optionalText, optionalUrl, pageSchema, requiredText } from "./common";

export const POST_TYPES = [
  "GENERAL",
  "QUESTION",
  "DISCUSSION",
  "ACHIEVEMENT",
  "OPPORTUNITY",
  "PROJECT",
  "ANNOUNCEMENT",
] as const;

export const REACTION_TYPES = ["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL", "FUNNY"] as const;

export const REPORT_REASONS = ["Spam", "Harassment", "Inappropriate", "Misinformation", "Other"] as const;

export const POST_MAX_LENGTH = 5000;
export const COMMENT_MAX_LENGTH = 2000;
export const POST_MAX_IMAGES = 4;

export const postSchema = z.object({
  type: z.enum(POST_TYPES, "Choose a post type.").default("GENERAL"),
  content: requiredText(POST_MAX_LENGTH, "Post text"),
  linkUrl: optionalUrl,
});

export type PostInput = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  content: requiredText(COMMENT_MAX_LENGTH, "Comment"),
});

export const reactionSchema = z.object({
  type: z.enum(REACTION_TYPES, "Choose a reaction."),
});

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, "Choose a reason."),
  details: optionalText(1000),
});

export const moderationSchema = z.object({
  reason: optionalText(300),
});

export const feedFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined).transform((v) => v || undefined),
  type: z.enum(POST_TYPES).optional().catch(undefined),
  page: pageSchema.default(1),
});

export type FeedFilters = z.infer<typeof feedFiltersSchema>;
