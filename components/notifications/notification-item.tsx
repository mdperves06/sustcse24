"use client";

import { useFormStatus } from "react-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { openNotificationAction } from "@/actions/notifications";
import type { NotificationType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { NOTIFICATION_META } from "./notification-icons";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  unread: boolean;
  timeLabel: string;
  timeIso: string;
};

function RowButton({ n }: { n: NotificationRow }) {
  const { pending } = useFormStatus();
  const meta = NOTIFICATION_META[n.type];
  const Icon = meta.icon;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none disabled:opacity-70",
        n.unread && "bg-primary/[0.04]",
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", meta.tone)} aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("min-w-0 flex-1 text-sm break-words", n.unread ? "font-semibold" : "text-foreground/85")}>
            {n.title}
          </span>
          {n.unread ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Unread</span>
            </span>
          ) : null}
        </span>
        {n.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.body}</span> : null}
        <span className="mt-1 block text-xs text-muted-foreground">
          {meta.label} · <time dateTime={n.timeIso}>{n.timeLabel}</time>
        </span>
      </span>
      {pending ? (
        <Loader2 className="mt-2 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : n.link ? (
        <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}

/** Clicking marks the notification read and opens its link (works without JavaScript too). */
export function NotificationItem({ notification }: { notification: NotificationRow }) {
  return (
    <form action={openNotificationAction}>
      <input type="hidden" name="id" value={notification.id} />
      {notification.link ? <input type="hidden" name="link" value={notification.link} /> : null}
      <RowButton n={notification} />
    </form>
  );
}
