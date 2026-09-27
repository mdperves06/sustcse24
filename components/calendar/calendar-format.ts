import { formatDate, formatTime, toLocalInputValue } from "@/lib/time";
import type { CalendarItem } from "@/services/calendar";

const longDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const shortWeekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });

/** "Saturday, 3 October" for a YYYY-MM-DD key. */
export const formatDayKey = (key: string) => longDay.format(Date.parse(`${key}T00:00:00Z`));
export const weekdayOfKey = (key: string) => shortWeekday.format(Date.parse(`${key}T00:00:00Z`));

export const itemStartKey = (item: Pick<CalendarItem, "start">) => toLocalInputValue(new Date(item.start), "date");

/** Short label shown on a chip for a given day. */
export function chipTime(item: CalendarItem, dayKey: string): string | null {
  if (item.allDay) return null;
  return itemStartKey(item) === dayKey ? formatTime(item.start) : "cont.";
}

/** Human-readable time span for the details dialog (Dhaka time). */
export function describeWhen(item: CalendarItem): string {
  const start = new Date(item.start);
  const end = item.end ? new Date(item.end) : null;
  if (item.allDay) {
    if (!end || toLocalInputValue(end, "date") === toLocalInputValue(start, "date")) return `${formatDate(start)} · All day`;
    return `${formatDate(start)} – ${formatDate(end)} · All day`;
  }
  if (!end) return `${formatDate(start)}, ${formatTime(start)}`;
  if (toLocalInputValue(end, "date") === toLocalInputValue(start, "date")) {
    return `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`;
  }
  return `${formatDate(start)}, ${formatTime(start)} – ${formatDate(end)}, ${formatTime(end)}`;
}

export const WEEKDAY_HEADERS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
