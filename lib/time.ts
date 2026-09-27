/**
 * The batch lives in Bangladesh, so all wall-clock times (event start, deadlines)
 * are interpreted and displayed in Asia/Dhaka regardless of server location.
 * Dhaka has no DST, so a fixed offset is exact.
 */
export const APP_TIME_ZONE = "Asia/Dhaka";
export const APP_UTC_OFFSET = "+06:00";
const OFFSET_MS = 6 * 60 * 60 * 1000;

/** Parses `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` (from HTML inputs) as Dhaka time. */
export function parseLocalInput(value: string): Date | null {
  const v = value.trim();
  let iso: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) iso = `${v}T00:00:00${APP_UTC_OFFSET}`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) iso = `${v}:00${APP_UTC_OFFSET}`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) iso = `${v}${APP_UTC_OFFSET}`;
  else iso = v;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses a calendar date (birthdays etc.) stored as UTC midnight. */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const d = new Date(`${value.trim()}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formats a Date for an `<input type="datetime-local">` / `date` default value (Dhaka time). */
export function toLocalInputValue(date: Date | null | undefined, kind: "datetime" | "date" = "datetime"): string {
  if (!date) return "";
  const shifted = new Date(date.getTime() + OFFSET_MS).toISOString();
  return kind === "date" ? shifted.slice(0, 10) : shifted.slice(0, 16);
}

export function toDateOnlyInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** The current calendar date in Dhaka. */
export function appToday(now = new Date()) {
  const shifted = new Date(now.getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Start of a Dhaka calendar day, as an absolute instant. */
export function appDayStart(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - OFFSET_MS);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, ...options });
    fmtCache.set(key, f);
  }
  return f;
}

export const formatDate = (d: Date | string) =>
  fmt({ day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
export const formatDateTime = (d: Date | string) =>
  fmt({ day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
export const formatTime = (d: Date | string) =>
  fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d));
export const formatWeekdayDate = (d: Date | string) =>
  fmt({ weekday: "short", day: "numeric", month: "short" }).format(new Date(d));
export const formatMonthDay = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(d));

export function formatRelative(d: Date | string, now = new Date()): string {
  const diff = (new Date(d).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(d);
}

/** Whole days from now until `d` in Dhaka calendar terms (negative when past). */
export function daysUntil(d: Date, now = new Date()): number {
  const t = appToday(now);
  const start = appDayStart(t.year, t.month, t.day).getTime();
  const target = new Date(d.getTime() + OFFSET_MS);
  const targetStart = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - OFFSET_MS;
  return Math.round((targetStart - start) / 86400000);
}
