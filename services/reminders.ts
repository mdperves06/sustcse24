import "server-only";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/privacy";
import { appToday, formatDateTime, formatRelative } from "@/lib/time";
import { isViewerBirthdayToday, listVisibleBirthdays } from "@/services/birthdays";
import { notifyUsers } from "@/services/notifications";

const HOUR = 3_600_000;

/**
 * Creates any due reminders for the viewer. Idempotent: every reminder has a
 * dedupeKey (unique per user), so calling this on every page load sends each once.
 */
export async function ensureReminders(viewer: Viewer): Promise<void> {
  const now = new Date();
  const t = appToday(now);
  const todayKey = `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;

  const [rsvps, bookmarks, birthdays, ownBirthday] = await Promise.all([
    db.eventAttendee.findMany({
      where: {
        userId: viewer.id,
        status: { in: ["GOING", "MAYBE"] },
        event: { deletedAt: null, startsAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) } },
      },
      select: { event: { select: { id: true, title: true, startsAt: true, location: true } } },
    }),
    db.opportunityBookmark.findMany({
      where: {
        userId: viewer.id,
        opportunity: { deletedAt: null, deadline: { gt: now, lte: new Date(now.getTime() + 72 * HOUR) } },
      },
      select: { opportunity: { select: { id: true, title: true, organization: true, deadline: true } } },
    }),
    listVisibleBirthdays(viewer, now),
    isViewerBirthdayToday(viewer),
  ]);

  const jobs: Promise<void>[] = [];

  for (const { event } of rsvps) {
    jobs.push(
      notifyUsers([viewer.id], {
        type: "EVENT_REMINDER",
        title: `⏰ ${event.title} starts ${formatRelative(event.startsAt, now)}`,
        body: `${formatDateTime(event.startsAt)} · ${event.location}`,
        link: `/events/${event.id}`,
        dedupeKey: `event-reminder:${event.id}`,
      }),
    );
  }

  for (const { opportunity } of bookmarks) {
    if (!opportunity.deadline) continue;
    jobs.push(
      notifyUsers([viewer.id], {
        type: "OPPORTUNITY_DEADLINE",
        title: `Deadline soon: ${opportunity.title}`,
        body: `${opportunity.organization} · closes ${formatDateTime(opportunity.deadline)}`,
        link: "/opportunities",
        dedupeKey: `opp-deadline:${opportunity.id}`,
      }),
    );
  }

  const others = birthdays.filter((p) => p.daysAway === 0 && p.userId !== viewer.id);
  if (others.length > 0) {
    const [first, ...rest] = others;
    jobs.push(
      notifyUsers([viewer.id], {
        type: "BIRTHDAY",
        title:
          rest.length === 0
            ? `🎂 ${first!.name} has a birthday today`
            : `🎂 ${first!.name} and ${rest.length} other${rest.length === 1 ? "" : "s"} have birthdays today`,
        body: "Send them a wish!",
        link: "/birthdays",
        dedupeKey: `birthdays:${todayKey}`,
      }),
    );
  }

  if (ownBirthday) {
    jobs.push(
      notifyUsers([viewer.id], {
        type: "BIRTHDAY",
        title: "🎉 Happy birthday!",
        body: "The whole CSE 24 batch wishes you a wonderful year ahead.",
        link: "/birthdays",
        dedupeKey: `own-birthday:${t.year}`,
      }),
    );
  }

  await Promise.all(jobs);
}
