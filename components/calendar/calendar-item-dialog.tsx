"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Building2, Clock, MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { RichText } from "@/components/shared/rich-text";
import { deleteCalendarEntryAction } from "@/actions/calendar";
import type { CalendarItem } from "@/services/calendar";
import { cn } from "@/lib/utils";
import { describeWhen } from "./calendar-format";

const LINK_LABEL: Record<CalendarItem["kind"], string> = {
  calendar: "",
  event: "Open event & RSVP",
  opportunity: "View opportunities",
  birthday: "View profile",
};

function Row({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export function CalendarItemDialog({ item, onClose }: { item: CalendarItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {item ? (
          <>
            <DialogHeader>
              <Badge variant="outline" className={cn("border", item.colorClass)}>
                {item.typeLabel}
              </Badge>
              <DialogTitle className="pr-6 text-lg leading-snug">{item.title}</DialogTitle>
              <DialogDescription className="sr-only">Details for this calendar item</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Row icon={Clock}>{describeWhen(item)}</Row>
              {item.meta.course ? <Row icon={BookOpen}>{item.meta.course}</Row> : null}
              {item.meta.location ? <Row icon={MapPin}>{item.meta.location}</Row> : null}
              {item.meta.organization ? <Row icon={Building2}>{item.meta.organization}</Row> : null}
            </div>
            {item.meta.description ? (
              <RichText text={item.meta.description} className="max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-3" />
            ) : null}
            {item.href || item.meta.canDelete ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                {item.meta.canDelete ? (
                  <ConfirmAction
                    title="Remove this calendar entry?"
                    description={`“${item.title}” will be removed from the batch calendar.`}
                    confirmLabel="Remove"
                    action={() => deleteCalendarEntryAction(item.id)}
                    onDone={onClose}
                    trigger={
                      <Button variant="destructive" size="sm">
                        <Trash2 aria-hidden /> Delete
                      </Button>
                    }
                  />
                ) : null}
                {item.href ? (
                  <Button size="sm" asChild>
                    <Link href={item.href}>
                      {LINK_LABEL[item.kind]} <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
