import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listEvents } from "@/services/events";
import { eventFiltersSchema } from "@/lib/validation/events";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EVENT_TYPE_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = eventFiltersSchema.parse(sp);
  const result = await listEvents(viewer, filters);
  const canManage = can(viewer.role, "events.manage");

  const tabHref = (tab: "upcoming" | "past") => {
    const params = new URLSearchParams();
    if (tab === "past") params.set("tab", "past");
    if (filters.type) params.set("type", filters.type);
    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  };

  return (
    <>
      <PageHeader
        title="Events"
        description="Meetups, tours, iftars, hackathons and more — RSVP so organizers know who's coming."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/events/new">
                <Plus aria-hidden /> New event
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Event timeframe" className="inline-flex w-fit rounded-lg bg-muted p-[3px]">
          {(["upcoming", "past"] as const).map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              aria-current={filters.tab === t ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                filters.tab === t && "bg-background text-foreground shadow-sm dark:bg-input/30",
              )}
            >
              {t === "upcoming" ? "Upcoming" : "Past"}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex gap-2">
          {filters.tab === "past" ? <input type="hidden" name="tab" value="past" /> : null}
          <label htmlFor="event-type" className="sr-only">
            Event type
          </label>
          <NativeSelect id="event-type" name="type" defaultValue={filters.type ?? ""} className="flex-1 sm:w-44 [&_select]:h-9">
            <NativeSelectOption value="">All types</NativeSelectOption>
            {options(EVENT_TYPE_LABELS).map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outline" className="h-9">
            Filter
          </Button>
        </form>
      </div>

      {result.events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={filters.tab === "past" ? "No past events" : "No upcoming events"}
          description={
            filters.type
              ? "Nothing of this type yet — try another filter."
              : filters.tab === "past"
                ? "Events will appear here once they've ended."
                : "New events will show up here, and you'll get a notification."
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.events.map((e) => (
            <li key={e.id}>
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/events" searchParams={sp} />
    </>
  );
}
