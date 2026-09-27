const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long" });

/** "29 February" — day and month only; the birth year is never shown. */
export const formatBirthday = (month: number, day: number) => fmt.format(Date.UTC(2000, month - 1, day));

export function daysAwayLabel(daysAway: number) {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}
