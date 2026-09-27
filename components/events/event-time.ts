import { formatDate, formatDateTime, formatTime, toLocalInputValue } from "@/lib/time";

/** "12 Oct 2026, 6:00 pm – 9:00 pm" or a multi-day range, in Dhaka time. */
export function formatEventRange(startsAt: Date, endsAt: Date | null): string {
  if (!endsAt) return formatDateTime(startsAt);
  const sameDay = toLocalInputValue(startsAt, "date") === toLocalInputValue(endsAt, "date");
  return sameDay
    ? `${formatDate(startsAt)}, ${formatTime(startsAt)} – ${formatTime(endsAt)}`
    : `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
}
