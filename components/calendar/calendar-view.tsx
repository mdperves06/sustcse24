"use client";

import { useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { CalendarDay, CalendarItem, CalendarViewData } from "@/services/calendar";
import { CALENDAR_CATEGORY_META } from "@/lib/validation/calendar";
import { cn } from "@/lib/utils";
import { CalendarItemDialog } from "./calendar-item-dialog";
import { chipTime, formatDayKey, WEEKDAY_HEADERS, weekdayOfKey } from "./calendar-format";

type Props = Pick<CalendarViewData, "view" | "days" | "items" | "today">;

function ItemChip({ item, dayKey, onOpen, className }: { item: CalendarItem; dayKey: string; onOpen: (i: CalendarItem) => void; className?: string }) {
  const time = chipTime(item, dayKey);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        item.colorClass,
        className,
      )}
    >
      {time ? <span className="shrink-0 tabular-nums opacity-80">{time}</span> : null}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

function AgendaRow({ item, dayKey, onOpen }: { item: CalendarItem; dayKey: string; onOpen: (i: CalendarItem) => void }) {
  const time = chipTime(item, dayKey);
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", CALENDAR_CATEGORY_META[item.category].dot)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="block text-xs text-muted-foreground">
          {item.typeLabel}
          {time ? ` · ${time}` : " · All day"}
          {item.meta.course ? ` · ${item.meta.course}` : ""}
          {item.meta.location ? ` · ${item.meta.location}` : ""}
        </span>
      </span>
    </button>
  );
}

function DayAgenda({
  dayKey,
  items,
  onOpen,
  isToday,
  showEmpty = true,
}: {
  dayKey: string;
  items: CalendarItem[];
  onOpen: (i: CalendarItem) => void;
  isToday?: boolean;
  showEmpty?: boolean;
}) {
  if (!showEmpty && items.length === 0) return null;
  return (
    <section aria-label={formatDayKey(dayKey)}>
      <h3 className={cn("mb-2 text-sm font-semibold", isToday && "text-primary")}>
        {formatDayKey(dayKey)}
        {isToday ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">Today</span> : null}
      </h3>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <AgendaRow item={i} dayKey={dayKey} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
      )}
    </section>
  );
}

const MAX_CHIPS = 3;

export function CalendarView({ view, days, items, today }: Props) {
  const [openItem, setOpenItem] = useState<CalendarItem | null>(null);
  const [moreDay, setMoreDay] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(() =>
    days.some((d) => d.key === today && d.inMonth) ? today : null,
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) for (const k of item.days) (map.get(k) ?? map.set(k, []).get(k)!).push(item);
    return map;
  }, [items]);
  const itemsOn = (key: string) => byDay.get(key) ?? [];

  const open = (i: CalendarItem) => {
    setMoreDay(null);
    setOpenItem(i);
  };

  const monthDays = days.filter((d) => d.inMonth);

  return (
    <>
      {view === "month" ? (
        <>
          {/* Desktop / tablet: full grid with chips */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-xs md:block">
            <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground" aria-hidden>
              {WEEKDAY_HEADERS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => (
                <MonthCell key={d.key} day={d} items={itemsOn(d.key)} onOpen={open} onMore={() => setMoreDay(d.key)} />
              ))}
            </div>
          </div>

          {/* Mobile: compact dot grid + agenda */}
          <div className="md:hidden">
            <div className="rounded-2xl border bg-card p-2 shadow-xs">
              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground" aria-hidden>
                {WEEKDAY_HEADERS.map((d) => (
                  <div key={d} className="py-1">
                    {d.slice(0, 2)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((d) => {
                  const dayItems = itemsOn(d.key);
                  const selected = selectedDay === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setSelectedDay(selected ? null : d.key)}
                      aria-pressed={selected}
                      aria-label={`${formatDayKey(d.key)}${dayItems.length ? `, ${dayItems.length} item${dayItems.length === 1 ? "" : "s"}` : ""}`}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        !d.inMonth && "text-muted-foreground/50",
                        d.isToday && !selected && "font-bold text-primary",
                        selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {d.day}
                      <span className="flex h-1.5 gap-0.5" aria-hidden>
                        {dayItems.slice(0, 3).map((i) => (
                          <span
                            key={i.id}
                            className={cn("size-1.5 rounded-full", selected ? "bg-primary-foreground" : CALENDAR_CATEGORY_META[i.category].dot)}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 space-y-4" aria-live="polite">
              {selectedDay ? (
                <>
                  <DayAgenda dayKey={selectedDay} items={itemsOn(selectedDay)} onOpen={open} isToday={selectedDay === today} />
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                    Show the whole month
                  </Button>
                </>
              ) : monthDays.some((d) => itemsOn(d.key).length) ? (
                monthDays.map((d) => (
                  <DayAgenda key={d.key} dayKey={d.key} items={itemsOn(d.key)} onOpen={open} isToday={d.isToday} showEmpty={false} />
                ))
              ) : (
                <EmptyState icon={CalendarX2} title="Nothing this month" description="Exams, deadlines, events and birthdays will show up here." />
              )}
            </div>
          </div>
        </>
      ) : null}

      {view === "week" ? (
        <>
          <div className="hidden grid-cols-7 overflow-hidden rounded-2xl border bg-card shadow-xs md:grid">
            {days.map((d) => (
              <div key={d.key} className={cn("min-h-64 border-r last:border-r-0", d.isWeekend && "bg-muted/30")}>
                <div className={cn("border-b px-2 py-2 text-center", d.isToday && "bg-primary/10")}>
                  <p className="text-xs text-muted-foreground">{weekdayOfKey(d.key)}</p>
                  <p className={cn("text-lg font-semibold tabular-nums", d.isToday && "text-primary")}>{d.day}</p>
                </div>
                <ul className="space-y-1 p-1.5">
                  {itemsOn(d.key).map((i) => (
                    <li key={i.id}>
                      <ItemChip item={i} dayKey={d.key} onOpen={open} className="flex-col items-start gap-0 py-1 [&>span]:w-full" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="space-y-5 md:hidden">
            {days.map((d) => (
              <DayAgenda key={d.key} dayKey={d.key} items={itemsOn(d.key)} onOpen={open} isToday={d.isToday} />
            ))}
          </div>
        </>
      ) : null}

      {view === "list" ? (
        items.length === 0 ? (
          <EmptyState icon={CalendarX2} title="Nothing scheduled this month" description="Try the next month, or check back later." />
        ) : (
          <div className="space-y-6">
            {days.map((d) => (
              <DayAgenda key={d.key} dayKey={d.key} items={itemsOn(d.key)} onOpen={open} isToday={d.isToday} showEmpty={false} />
            ))}
          </div>
        )
      ) : null}

      <Dialog open={moreDay !== null} onOpenChange={(o) => !o && setMoreDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{moreDay ? formatDayKey(moreDay) : ""}</DialogTitle>
            <DialogDescription>Everything on this day</DialogDescription>
          </DialogHeader>
          {moreDay ? (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
              {itemsOn(moreDay).map((i) => (
                <li key={i.id}>
                  <AgendaRow item={i} dayKey={moreDay} onOpen={open} />
                </li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>

      <CalendarItemDialog item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}

function MonthCell({
  day,
  items,
  onOpen,
  onMore,
}: {
  day: CalendarDay;
  items: CalendarItem[];
  onOpen: (i: CalendarItem) => void;
  onMore: () => void;
}) {
  const extra = items.length - MAX_CHIPS;
  return (
    <div
      className={cn(
        "min-h-28 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0",
        !day.inMonth && "bg-muted/30 text-muted-foreground",
        day.isWeekend && day.inMonth && "bg-muted/15",
      )}
    >
      <div className="mb-1 flex justify-end">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
            day.isToday && "bg-primary text-primary-foreground",
          )}
          aria-label={formatDayKey(day.key)}
        >
          {day.day}
        </span>
      </div>
      <ul className="space-y-1">
        {items.slice(0, extra > 0 ? MAX_CHIPS - 1 : MAX_CHIPS).map((i) => (
          <li key={i.id}>
            <ItemChip item={i} dayKey={day.key} onOpen={onOpen} />
          </li>
        ))}
        {extra > 0 ? (
          <li>
            <button
              type="button"
              onClick={onMore}
              className="w-full rounded-md px-1.5 py-0.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              +{extra + 1} more
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
