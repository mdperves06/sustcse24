import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/errors";
import { appDayStart, appToday, parseLocalInput, toLocalInputValue } from "@/lib/time";
import { CALENDAR_TYPE_LABELS, EVENT_TYPE_LABELS, OPPORTUNITY_TYPE_LABELS } from "@/lib/labels";
import type { Viewer } from "@/lib/privacy";
import type { CalendarEventType } from "@/lib/generated/prisma/enums";
import {
  CALENDAR_CATEGORY_META,
  calendarEntrySchema,
  type CalendarCategory,
} from "@/lib/validation/calendar";
import { celebrationDate, listVisibleBirthdays } from "@/services/birthdays";

export type CalendarItemKind = "calendar" | "event" | "opportunity" | "birthday";

/** One entry on the batch calendar, merged from every source. Dates are ISO strings (JSON-safe). */
export type CalendarItem = {
  id: string;
  kind: CalendarItemKind;
  category: CalendarCategory;
  typeLabel: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  href: string | null;
  colorClass: string;
  /** Dhaka calendar days (YYYY-MM-DD) this item appears on, clipped to the requested range. */
  days: string[];
  meta: {
    location?: string | null;
    course?: string | null;
    description?: string | null;
    organization?: string | null;
    /** Calendar entries only: whether the viewer may delete it. */
    canDelete?: boolean;
  };
};

// ───────────── Civil-date helpers (YYYY-MM-DD keys in Dhaka) ─────────────

const DAY_MS = 86_400_000;
const keyToUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const utcToKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (key: string, n: number) => utcToKey(keyToUtc(key) + n * DAY_MS);
const dhakaKey = (d: Date) => toLocalInputValue(d, "date");
const keyParts = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
};
const instantOf = (key: string) => {
  const { y, m, d } = keyParts(key);
  return appDayStart(y, m, d);
};
export function todayKey(now = new Date()) {
  const t = appToday(now);
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}
function addMonths(key: string, n: number) {
  const { y, m } = keyParts(key);
  return utcToKey(Date.UTC(y, m - 1 + n, 1));
}
const monthStart = (key: string) => `${key.slice(0, 7)}-01`;
const monthEnd = (key: string) => addDays(addMonths(key, 1), -1);
/** Weeks start on Saturday (Bangladesh convention). */
const weekStart = (key: string) => addDays(key, -((new Date(keyToUtc(key)).getUTCDay() + 1) % 7));

function eachDay(from: string, to: string, max = 62): string[] {
  const out: string[] = [];
  for (let k = from; k <= to && out.length < max; k = addDays(k, 1)) out.push(k);
  return out;
}

function occurrenceDays(start: Date, end: Date | null, allDay: boolean, rangeFrom: string, rangeTo: string) {
  const startKey = dhakaKey(start);
  let endKey = startKey;
  if (end && end > start) endKey = allDay ? dhakaKey(end) : dhakaKey(new Date(end.getTime() - 1));
  const from = startKey > rangeFrom ? startKey : rangeFrom;
  const to = endKey < rangeTo ? endKey : rangeTo;
  return from <= to ? eachDay(from, to) : [];
}

const CALENDAR_TYPE_CATEGORY: Record<CalendarEventType, CalendarCategory> = {
  EXAM: "EXAM",
  ASSIGNMENT: "ASSIGNMENT",
  DEADLINE: "DEADLINE",
  BATCH_EVENT: "BATCH_EVENT",
  COMPETITION: "COMPETITION",
  WORKSHOP: "WORKSHOP",
  OTHER: "OTHER",
};

const chip = (c: CalendarCategory) => CALENDAR_CATEGORY_META[c].chip;

// ───────────── Queries ─────────────

/** Merged calendar items for the Dhaka days `fromKey`…`toKey` (inclusive). */
export async function getCalendarItems(viewer: Viewer, fromKey: string, toKey: string): Promise<CalendarItem[]> {
  const from = instantOf(fromKey);
  const to = instantOf(addDays(toKey, 1));
  const overlap = { startsAt: { lt: to }, OR: [{ startsAt: { gte: from } }, { endsAt: { gte: from } }] };
  const canManage = can(viewer.role, "calendar.manage");

  const [entries, events, opportunities, birthdays] = await Promise.all([
    db.calendarEvent.findMany({ where: { deletedAt: null, ...overlap }, orderBy: { startsAt: "asc" }, take: 500 }),
    db.event.findMany({
      where: { deletedAt: null, ...overlap },
      orderBy: { startsAt: "asc" },
      take: 200,
      select: { id: true, title: true, type: true, startsAt: true, endsAt: true, location: true, organizer: true, description: true },
    }),
    db.opportunity.findMany({
      where: { deletedAt: null, deadline: { gte: from, lt: to } },
      orderBy: { deadline: "asc" },
      take: 200,
      select: { id: true, title: true, organization: true, type: true, deadline: true, location: true },
    }),
    listVisibleBirthdays(viewer),
  ]);

  const items: CalendarItem[] = [];

  for (const e of entries) {
    const category = CALENDAR_TYPE_CATEGORY[e.type];
    items.push({
      id: `calendar:${e.id}`,
      kind: "calendar",
      category,
      typeLabel: CALENDAR_TYPE_LABELS[e.type],
      title: e.title,
      start: e.startsAt.toISOString(),
      end: e.endsAt?.toISOString() ?? null,
      allDay: e.allDay,
      href: null,
      colorClass: chip(category),
      days: occurrenceDays(e.startsAt, e.endsAt, e.allDay, fromKey, toKey),
      meta: { location: e.location, course: e.course, description: e.description, canDelete: canManage },
    });
  }

  for (const e of events) {
    items.push({
      id: `event:${e.id}`,
      kind: "event",
      category: "BATCH_EVENT",
      typeLabel: EVENT_TYPE_LABELS[e.type],
      title: e.title,
      start: e.startsAt.toISOString(),
      end: e.endsAt?.toISOString() ?? null,
      allDay: false,
      href: `/events/${e.id}`,
      colorClass: chip("BATCH_EVENT"),
      days: occurrenceDays(e.startsAt, e.endsAt, false, fromKey, toKey),
      meta: {
        location: e.location,
        organization: e.organizer,
        description: e.description.length > 300 ? `${e.description.slice(0, 299)}…` : e.description,
      },
    });
  }

  for (const o of opportunities) {
    if (!o.deadline) continue;
    items.push({
      id: `opportunity:${o.id}`,
      kind: "opportunity",
      category: "COMPETITION",
      typeLabel: `${OPPORTUNITY_TYPE_LABELS[o.type]} deadline`,
      title: `Deadline: ${o.title}`,
      start: o.deadline.toISOString(),
      end: null,
      allDay: false,
      href: "/opportunities",
      colorClass: chip("COMPETITION"),
      days: occurrenceDays(o.deadline, null, false, fromKey, toKey),
      meta: { organization: o.organization, location: o.location },
    });
  }

  // Birthdays: day + month only, placed in whichever displayed year(s) the range covers.
  const years = [...new Set([keyParts(fromKey).y, keyParts(toKey).y])];
  for (const p of birthdays) {
    for (const year of years) {
      const c = celebrationDate(year, p.month, p.day);
      const key = `${year}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
      if (key < fromKey || key > toKey) continue;
      items.push({
        id: `birthday:${p.userId}:${year}`,
        kind: "birthday",
        category: "BIRTHDAY",
        typeLabel: "Birthday",
        title: `🎂 ${p.name}`,
        start: appDayStart(year, c.month, c.day).toISOString(),
        end: null,
        allDay: true,
        href: `/students/${encodeURIComponent(p.roll)}`,
        colorClass: chip("BIRTHDAY"),
        days: [key],
        meta: {},
      });
    }
  }

  return items
    .filter((i) => i.days.length > 0)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

export type CalendarViewMode = "month" | "week" | "list";

export type CalendarDay = { key: string; day: number; inMonth: boolean; isToday: boolean; isWeekend: boolean };

export type CalendarViewData = {
  view: CalendarViewMode;
  anchor: string;
  today: string;
  title: string;
  from: string;
  to: string;
  prev: string;
  next: string;
  days: CalendarDay[];
  items: CalendarItem[];
};

const monthTitle = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
const shortDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const shortDayYear = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** Everything the calendar page needs: grid days, navigation targets and merged items. */
export async function buildCalendarView(
  viewer: Viewer,
  query: { view: CalendarViewMode; date?: string },
): Promise<CalendarViewData> {
  const today = todayKey();
  const anchor = query.date && parseLocalInput(query.date) ? query.date : today;
  const anchorMonth = anchor.slice(0, 7);

  let from: string;
  let to: string;
  let title: string;
  let prev: string;
  let next: string;

  if (query.view === "week") {
    from = weekStart(anchor);
    to = addDays(from, 6);
    title = `${shortDay.format(keyToUtc(from))} – ${shortDayYear.format(keyToUtc(to))}`;
    prev = addDays(from, -7);
    next = addDays(from, 7);
  } else {
    const first = monthStart(anchor);
    const last = monthEnd(anchor);
    title = monthTitle.format(keyToUtc(first));
    prev = addMonths(first, -1);
    next = addMonths(first, 1);
    if (query.view === "month") {
      from = weekStart(first);
      to = addDays(weekStart(last), 6);
    } else {
      from = first;
      to = last;
    }
  }

  const days: CalendarDay[] = eachDay(from, to, 42).map((key) => {
    const dow = new Date(keyToUtc(key)).getUTCDay();
    return {
      key,
      day: keyParts(key).d,
      inMonth: query.view === "week" || key.startsWith(anchorMonth),
      isToday: key === today,
      isWeekend: dow === 5 || dow === 6,
    };
  });

  return { view: query.view, anchor, today, title, from, to, prev, next, days, items: await getCalendarItems(viewer, from, to) };
}

// ───────────── Mutations (calendar.manage) ─────────────

export async function createCalendarEntry(actor: Viewer, input: unknown) {
  assertCan(actor, "calendar.manage");
  const data = calendarEntrySchema.parse(input);
  // All-day entries are stored at Dhaka midnight of their first and (inclusive) last day.
  const startsAt = data.allDay ? instantOf(dhakaKey(data.startsAt)) : data.startsAt;
  const endsAt = data.endsAt ? (data.allDay ? instantOf(dhakaKey(data.endsAt)) : data.endsAt) : null;
  const row = await db.calendarEvent.create({
    data: {
      title: data.title,
      type: data.type,
      course: data.course,
      location: data.location,
      description: data.description,
      startsAt,
      endsAt: endsAt && data.allDay && endsAt.getTime() === startsAt.getTime() ? null : endsAt,
      allDay: data.allDay,
      createdById: actor.id,
    },
    select: { id: true, title: true, type: true, startsAt: true },
  });
  await audit({
    actorId: actor.id,
    action: "calendar.create",
    entityType: "CalendarEvent",
    entityId: row.id,
    metadata: { title: row.title, type: row.type },
  });
  return { ...row, dateKey: dhakaKey(row.startsAt) };
}

export async function deleteCalendarEntry(actor: Viewer, id: string) {
  assertCan(actor, "calendar.manage");
  const row = await db.calendarEvent.findFirst({ where: { id, deletedAt: null }, select: { id: true, title: true } });
  if (!row) throw new NotFoundError("This calendar entry doesn't exist or was removed.");
  await db.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actorId: actor.id, action: "calendar.delete", entityType: "CalendarEvent", entityId: id, metadata: { title: row.title } });
}
