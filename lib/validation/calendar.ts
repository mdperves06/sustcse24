import { z } from "zod";
import { CalendarEventType } from "@/lib/generated/prisma/enums";
import { parseLocalInput } from "@/lib/time";
import { checkbox, optionalDate, optionalText, requiredDate, requiredText } from "./common";

export const calendarEntrySchema = z
  .object({
    title: requiredText(160, "Title"),
    type: z.enum(CalendarEventType, "Choose a type."),
    course: optionalText(60),
    location: optionalText(200),
    description: optionalText(2000),
    startsAt: requiredDate,
    endsAt: optionalDate,
    allDay: checkbox,
  })
  .superRefine((v, ctx) => {
    if (v.endsAt && (v.allDay ? v.endsAt < v.startsAt : v.endsAt <= v.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
    }
  });

export type CalendarEntryInput = z.infer<typeof calendarEntrySchema>;

const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => parseLocalInput(v) !== null);

export const calendarQuerySchema = z.object({
  view: z.enum(["month", "week", "list"]).default("month").catch("month"),
  date: dateParam.optional().catch(undefined),
});

export const calendarRangeSchema = z
  .object({ from: dateParam, to: dateParam })
  .refine((v) => v.from <= v.to, { message: "`from` must be on or before `to`.", path: ["to"] })
  .refine(
    (v) => (Date.parse(`${v.to}T00:00:00Z`) - Date.parse(`${v.from}T00:00:00Z`)) / 86_400_000 <= 120,
    { message: "Ranges are limited to 120 days.", path: ["to"] },
  );

/** Every colour group shown in the calendar legend. */
export type CalendarCategory =
  | "EXAM"
  | "ASSIGNMENT"
  | "DEADLINE"
  | "BATCH_EVENT"
  | "WORKSHOP"
  | "COMPETITION"
  | "BIRTHDAY"
  | "OTHER";

/** Shared by the calendar service (colorClass) and the legend (semantic tokens → light & dark). */
export const CALENDAR_CATEGORY_META: Record<CalendarCategory, { label: string; chip: string; dot: string }> = {
  EXAM: { label: "Exams", chip: "bg-destructive/12 text-destructive border-destructive/30", dot: "bg-destructive" },
  ASSIGNMENT: { label: "Assignments", chip: "bg-chart-3/15 text-chart-3 border-chart-3/30", dot: "bg-chart-3" },
  DEADLINE: { label: "Deadlines", chip: "bg-foreground/10 text-foreground border-foreground/20", dot: "bg-foreground" },
  BATCH_EVENT: { label: "Batch events", chip: "bg-chart-1/15 text-chart-1 border-chart-1/30", dot: "bg-chart-1" },
  WORKSHOP: { label: "Workshops", chip: "bg-chart-2/15 text-chart-2 border-chart-2/30", dot: "bg-chart-2" },
  COMPETITION: {
    label: "Competitions & opportunities",
    chip: "bg-chart-5/15 text-chart-5 border-chart-5/30",
    dot: "bg-chart-5",
  },
  BIRTHDAY: { label: "Birthdays", chip: "bg-chart-4/15 text-chart-4 border-chart-4/30", dot: "bg-chart-4" },
  OTHER: { label: "Other", chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};
