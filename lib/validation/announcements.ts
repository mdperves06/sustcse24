import { z } from "zod";
import { AnnouncementCategory, Priority } from "@/lib/generated/prisma/enums";
import { checkbox, optionalDate, pageSchema, requiredText } from "./common";

export const announcementSchema = z.object({
  title: requiredText(160, "Title"),
  body: requiredText(10_000, "Message"),
  category: z.enum(AnnouncementCategory, "Choose a category."),
  priority: z.enum(Priority, "Choose a priority."),
  expiresAt: optionalDate,
  pinned: checkbox,
  /** Edit form only: drop the current attachment. */
  removeAttachment: checkbox,
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const announcementFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z.enum(AnnouncementCategory).optional().catch(undefined),
  view: z.enum(["active", "archived"]).default("active").catch("active"),
  page: pageSchema.default(1),
});

export type AnnouncementFilters = z.infer<typeof announcementFiltersSchema>;
