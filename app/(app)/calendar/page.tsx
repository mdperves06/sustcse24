import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List, Rows3 } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { buildCalendarView } from "@/services/calendar";
import { calendarQuerySchema } from "@/lib/validation/calendar";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarLegend } from "@/components/calendar/calendar-legend";
import { CalendarEntryDialog } from "@/components/calendar/calendar-entry-dialog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Batch calendar" };

const VIEWS = [
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "week", label: "Week", icon: Rows3 },
  { value: "list", label: "List", icon: List },
] as const;

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const viewer = await requireUser();
  const query = calendarQuerySchema.parse(await searchParams);
  const data = await buildCalendarView(viewer, query);
  const canManage = can(viewer.role, "calendar.manage");

  const href = (params: { view?: string; date?: string | null }) => {
    const sp = new URLSearchParams();
    const view = params.view ?? data.view;
    if (view !== "month") sp.set("view", view);
    const date = params.date === undefined ? data.anchor : params.date;
    if (date && date !== data.today) sp.set("date", date);
    const qs = sp.toString();
    return qs ? `/calendar?${qs}` : "/calendar";
  };

  return (
    <>
      <PageHeader
        title="Batch calendar"
        description="Exams, assignments, deadlines, events and birthdays in one place. All times are Bangladesh time."
        actions={canManage ? <CalendarEntryDialog defaultDate={data.anchor} /> : null}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href={href({ date: data.prev })} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Previous">
            <ChevronLeft aria-hidden />
          </Link>
          <Link href={href({ date: null })} className={buttonVariants({ variant: "outline" })}>
            Today
          </Link>
          <Link href={href({ date: data.next })} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Next">
            <ChevronRight aria-hidden />
          </Link>
          <h2 className="ml-1 text-lg font-semibold tracking-tight" aria-live="polite">
            {data.title}
          </h2>
        </div>
        <nav aria-label="Calendar view" className="inline-flex w-fit rounded-lg bg-muted p-[3px]">
          {VIEWS.map((v) => (
            <Link
              key={v.value}
              href={href({ view: v.value })}
              aria-current={data.view === v.value ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                data.view === v.value && "bg-background text-foreground shadow-sm dark:bg-input/30",
              )}
            >
              <v.icon className="size-4" aria-hidden /> {v.label}
            </Link>
          ))}
        </nav>
      </div>

      <CalendarView key={`${data.view}:${data.from}`} view={data.view} days={data.days} items={data.items} today={data.today} />

      <CalendarLegend className="mt-4" />
    </>
  );
}
