import { z } from "zod";
import { optionalText, requiredText } from "./common";

/** One emoji (may include skin-tone modifiers / ZWJ sequences / flags). */
const emoji = z
  .string()
  .trim()
  .max(16, "Use a single emoji.")
  .optional()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => !v || /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Component}|‍|️)+$/u.test(v),
    "Use a single emoji.",
  );

export const groupSchema = z.object({
  name: requiredText(60, "Group name").min(2, "Use at least 2 characters."),
  description: requiredText(1000, "Description"),
  icon: emoji,
});

export const groupDescriptionSchema = z.object({
  description: requiredText(1000, "Description"),
});

export const groupRoleSchema = z.object({
  role: z.enum(["MEMBER", "MANAGER"], "Choose a role."),
});

export const groupNoteSchema = z.object({ note: optionalText(200) });
