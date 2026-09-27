import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock, MapPin, UserRound, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getEvent } from "@/services/events";
import { NotFoundError } from "@/lib/errors";
import { formatDateTime } from "@/lib/time";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { Viewer } from "@/lib/privacy";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { EventCover, EventDateBlock } from "@/components/events/event-cover";
import { RsvpControl } from "@/components/events/rsvp-control";
import { EventAdminActions } from "@/components/events/event-admin-actions";
import { formatEventRange } from "@/components/events/event-time";

export const metadata: Metadata = { title: "Event" };

async function load(viewer: Viewer, id: string) {
  try {
    return await getEvent(viewer, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

function Detail({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{children}</p>
      </div>
    </div>
  );
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const e = await load(viewer, id);
  const canManage = can(viewer.role, "events.manage");
  const now = new Date();
  const closedReason = e.isPast
    ? "This event has ended."
    : now >= e.startsAt
      ? "This event has already started — RSVPs are closed."
      : "The registration deadline has passed — RSVPs are closed.";

  return (
    <div className="space-y-4">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All events
      </Link>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <EventCover coverKey={e.coverKey} type={e.type} title={e.title} className="aspect-[16/7] sm:aspect-[16/5]" sizes="100vw" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-8">
          <EventDateBlock date={e.startsAt} className="hidden sm:flex" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{EVENT_TYPE_LABELS[e.type]}</Badge>
              {e.isPast ? <Badge variant="outline">Ended</Badge> : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{e.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Organized by {e.organizer}</p>
          </div>
          {canManage ? <EventAdminActions id={e.id} /> : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
            <h2 className="mb-3 font-semibold">About this event</h2>
            <RichText text={e.description} />
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6" aria-labelledby="going-heading">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 id="going-heading" className="flex items-center gap-2 font-semibold">
                <Users className="size-4 text-primary" aria-hidden /> Who&apos;s going
              </h2>
              <span className="text-sm text-muted-foreground tabular-nums">{e.goingTotal}</span>
            </div>
            {e.going.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one has confirmed yet — be the first!</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {e.going.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/students/${encodeURIComponent(u.roll)}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                    >
                      <UserAvatar name={u.name} avatarKey={u.avatarKey} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{u.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{u.roll}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {e.goingTotal > e.going.length ? (
              <p className="mt-3 text-xs text-muted-foreground">and {e.goingTotal - e.going.length} more</p>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-5 shadow-xs" aria-labelledby="rsvp-heading">
            <h2 id="rsvp-heading" className="mb-3 font-semibold">
              Are you coming?
            </h2>
            <RsvpControl eventId={e.id} status={e.viewerStatus} open={e.rsvpOpen} closedReason={closedReason} />
            {e.rsvpOpen && e.registrationDeadline ? (
              <p className="mt-3 text-xs text-muted-foreground">RSVP by {formatDateTime(e.registrationDeadline)}</p>
            ) : null}
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center">
              {(
                [
                  ["Going", e.counts.going, "text-success"],
                  ["Maybe", e.counts.maybe, "text-warning"],
                  ["Not going", e.counts.notGoing, "text-muted-foreground"],
                ] as const
              ).map(([label, n, tone]) => (
                <div key={label} className="rounded-lg bg-muted/50 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className={`text-lg font-semibold tabular-nums ${tone}`}>{n}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
            <Detail icon={Clock} label="When">
              {formatEventRange(e.startsAt, e.endsAt)}
            </Detail>
            <Detail icon={MapPin} label="Where">
              {e.location}
            </Detail>
            <Detail icon={UserRound} label="Organizer">
              {e.organizer}
            </Detail>
            {e.registrationDeadline ? (
              <Detail icon={CalendarClock} label="Registration deadline">
                {formatDateTime(e.registrationDeadline)}
              </Detail>
            ) : null}
            <p className="border-t pt-3 text-xs text-muted-foreground">
              Posted by{" "}
              <Link href={`/students/${encodeURIComponent(e.createdBy.roll)}`} className="font-medium text-foreground hover:underline">
                {e.createdBy.name}
              </Link>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
