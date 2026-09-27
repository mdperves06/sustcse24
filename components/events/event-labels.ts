import type { EventType, RsvpStatus } from "@/lib/generated/prisma/enums";

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  GOING: "Going",
  MAYBE: "Maybe",
  NOT_GOING: "Not going",
};

export const RSVP_MESSAGES: Record<RsvpStatus, string> = {
  GOING: "You're going! 🎉",
  MAYBE: "Marked as maybe.",
  NOT_GOING: "Got it — you're not going.",
};

export const RSVP_BADGE: Record<RsvpStatus, string> = {
  GOING: "bg-success/15 text-success",
  MAYBE: "bg-warning/15 text-warning",
  NOT_GOING: "bg-muted text-muted-foreground",
};

/** Fallback cover gradients per event type (semantic tokens only). */
export const EVENT_GRADIENT: Record<EventType, string> = {
  MEETUP: "from-chart-1 to-chart-4",
  TOUR: "from-chart-2 to-chart-5",
  SPORTS: "from-chart-5 to-chart-3",
  REUNION: "from-chart-4 to-chart-1",
  IFTAR: "from-chart-3 to-chart-4",
  HACKATHON: "from-chart-1 to-chart-2",
  WORKSHOP: "from-chart-2 to-chart-1",
  SEMINAR: "from-primary to-chart-2",
  ACADEMIC: "from-primary to-chart-5",
  OTHER: "from-chart-1 to-chart-3",
};
