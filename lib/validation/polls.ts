import { z } from "zod";
import { checkbox, idSchema, optionalDate, optionalText, requiredText } from "./common";

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;

export const pollSchema = z
  .object({
    question: requiredText(300, "Question"),
    description: optionalText(1000),
    options: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((v) => (Array.isArray(v) ? v : v ? [v] : []).map((o) => o.trim()).filter(Boolean))
      .pipe(
        z
          .array(z.string().max(200, "Options can be at most 200 characters."))
          .min(POLL_MIN_OPTIONS, `Add at least ${POLL_MIN_OPTIONS} options.`)
          .max(POLL_MAX_OPTIONS, `Use at most ${POLL_MAX_OPTIONS} options.`)
          .refine((opts) => new Set(opts.map((o) => o.toLowerCase())).size === opts.length, "Options must be different."),
      ),
    multipleChoice: checkbox,
    anonymous: checkbox,
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .superRefine((data, ctx) => {
    const start = data.startsAt ?? new Date();
    if (data.endsAt && data.endsAt.getTime() <= start.getTime()) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after the start time." });
    }
    if (data.endsAt && data.endsAt.getTime() <= Date.now()) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be in the future." });
    }
  });

export type PollInput = z.infer<typeof pollSchema>;

export const voteSchema = z.object({
  optionIds: z
    .union([idSchema, z.array(idSchema)], "Choose an option.")
    .transform((v) => [...new Set(Array.isArray(v) ? v : [v])])
    .pipe(z.array(idSchema).min(1, "Choose an option.").max(POLL_MAX_OPTIONS)),
});
