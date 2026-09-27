import { CALENDAR_CATEGORY_META, type CalendarCategory } from "@/lib/validation/calendar";
import { cn } from "@/lib/utils";

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="Calendar legend" className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
      {(Object.entries(CALENDAR_CATEGORY_META) as [CalendarCategory, (typeof CALENDAR_CATEGORY_META)[CalendarCategory]][]).map(
        ([key, meta]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden />
            {meta.label}
          </li>
        ),
      )}
    </ul>
  );
}
