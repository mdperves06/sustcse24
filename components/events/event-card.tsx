import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventSummary } from "@/services/events";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { EventCover, EventDateBlock } from "./event-cover";
import { RSVP_BADGE, RSVP_LABELS } from "./event-labels";
import { formatEventRange } from "./event-time";

export function EventCard({ event: e }: { event: EventSummary }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all focus-within:ring-3 focus-within:ring-ring/50 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative">
        <EventCover coverKey={e.coverKey} type={e.type} title={e.title} className={cn("aspect-[16/8]", e.isPast && "grayscale-[40%]")} />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge className="bg-background/90 text-foreground shadow-sm backdrop-blur">{EVENT_TYPE_LABELS[e.type]}</Badge>
        </div>
        {e.viewerStatus ? (
          <Badge className={cn("absolute top-3 right-3 shadow-sm", RSVP_BADGE[e.viewerStatus], "bg-background/90 backdrop-blur")}>
            <span className={cn("size-1.5 rounded-full", e.viewerStatus === "GOING" ? "bg-success" : e.viewerStatus === "MAYBE" ? "bg-warning" : "bg-muted-foreground")} aria-hidden />
            You: {RSVP_LABELS[e.viewerStatus]}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 gap-3 p-4">
        <EventDateBlock date={e.startsAt} className="-mt-9 relative" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">
            <Link href={`/events/${e.id}`} className="outline-none after:absolute after:inset-0">
              {e.title}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Clock className="mt-px size-3.5 shrink-0" aria-hidden /> {formatEventRange(e.startsAt, e.endsAt)}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-px size-3.5 shrink-0" aria-hidden /> <span className="truncate">{e.location}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden />
          <span>
            <strong className="font-semibold text-foreground tabular-nums">{e.counts.going}</strong> going ·{" "}
            <strong className="font-semibold text-foreground tabular-nums">{e.counts.maybe}</strong> maybe
          </span>
        </span>
        {e.isPast ? <span>Ended</span> : e.rsvpOpen ? <span className="font-medium text-success">RSVP open</span> : <span>RSVP closed</span>}
      </div>
    </article>
  );
}
