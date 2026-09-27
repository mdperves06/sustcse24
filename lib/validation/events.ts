import { z } from "zod";
import { EventType, RsvpStatus } from "@/lib/generated/prisma/enums";
import { checkbox, optionalDate, pageSchema, requiredDate, requiredText } from "./common";

/**
 * Start/end/deadline come from `datetime-local` inputs (or ISO strings via the API)
 * and are interpreted as Asia/Dhaka wall-clock time.
 */
export const eventSchema = z
  .object({
    title: requiredText(160, "Title"),
    description: requiredText(10_000, "Description"),
    type: z.enum(EventType, "Choose an event type."),
    startsAt: requiredDate,
    endsAt: optionalDate,
    location: requiredText(200, "Location"),
    organizer: requiredText(120, "Organizer"),
    registrationDeadline: optionalDate,
    /** Edit form only: drop the current cover image. */
    removeCover: checkbox,
  })
  .superRefine((v, ctx) => {
    if (v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
    }
    if (v.registrationDeadline && v.registrationDeadline > v.startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "The registration deadline must be before the event starts.",
      });
    }
  });

export type EventInput = z.infer<typeof eventSchema>;

export const rsvpSchema = z.object({ status: z.enum(RsvpStatus, "Choose Going, Maybe or Not going.") });

export const eventFiltersSchema = z.object({
  tab: z.enum(["upcoming", "past"]).default("upcoming").catch("upcoming"),
  type: z.enum(EventType).optional().catch(undefined),
  page: pageSchema.default(1),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;
