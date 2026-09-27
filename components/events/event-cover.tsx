import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { fileUrl } from "@/lib/files";
import { APP_TIME_ZONE } from "@/lib/time";
import type { EventType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { EVENT_GRADIENT } from "./event-labels";

/** Cover image, or a type-coloured gradient when none was uploaded. */
export function EventCover({
  coverKey,
  type,
  title,
  className,
  sizes = "(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw",
}: {
  coverKey: string | null;
  type: EventType;
  title: string;
  className?: string;
  sizes?: string;
}) {
  const src = fileUrl(coverKey);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image src={src} alt={`Cover image for ${title}`} fill unoptimized sizes={sizes} className="object-cover" />
      ) : (
        <div className={cn("flex size-full items-center justify-center bg-gradient-to-br opacity-90", EVENT_GRADIENT[type])} aria-hidden>
          <CalendarDays className="size-10 text-white/70" />
        </div>
      )}
    </div>
  );
}

const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, month: "short" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, weekday: "short" });

/** Calendar-page style date block (Dhaka time). */
export function EventDateBlock({ date, className }: { date: Date; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-14 shrink-0 flex-col items-center rounded-xl border bg-card py-1.5 text-center leading-none shadow-xs",
        className,
      )}
      aria-hidden
    >
      <span className="text-[10px] font-semibold tracking-wide text-primary uppercase">{monthFmt.format(date)}</span>
      <span className="mt-1 text-xl font-bold tabular-nums">{dayFmt.format(date)}</span>
      <span className="mt-1 text-[10px] text-muted-foreground">{weekdayFmt.format(date)}</span>
    </div>
  );
}
