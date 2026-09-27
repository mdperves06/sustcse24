import { CalendarClock, CalendarX2, Flame, Infinity as InfinityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** "Due today", "Closes tomorrow", "5 days left", "Expired". */
export function deadlineLabel(daysLeft: number | null, expired: boolean): string {
  if (expired) return "Expired";
  if (daysLeft === null) return "No deadline";
  if (daysLeft <= 0) return "Due today";
  if (daysLeft === 1) return "Closes tomorrow";
  return `${daysLeft} days left`;
}

export function DeadlineBadge({
  daysLeft,
  expired,
  urgent,
  className,
}: {
  daysLeft: number | null;
  expired: boolean;
  urgent: boolean;
  className?: string;
}) {
  const label = deadlineLabel(daysLeft, expired);
  if (expired) {
    return (
      <Badge variant="destructive" className={className}>
        <CalendarX2 aria-hidden /> {label}
      </Badge>
    );
  }
  if (daysLeft === null) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        <InfinityIcon aria-hidden /> {label}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        urgent ? "border-warning/40 bg-warning/15 text-warning" : "border-success/30 bg-success/10 text-success",
        className,
      )}
    >
      {urgent ? <Flame aria-hidden /> : <CalendarClock aria-hidden />} {label}
    </Badge>
  );
}
