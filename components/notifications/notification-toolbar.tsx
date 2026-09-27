"use client";

import { CheckCheck, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useServerAction } from "@/hooks/use-action-form";
import { clearReadNotificationsAction, markAllNotificationsReadAction } from "@/actions/notifications";

export function NotificationToolbar({ unread, read }: { unread: number; read: number }) {
  const markAll = useServerAction();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={unread === 0 || markAll.pending}
        onClick={() => markAll.run(markAllNotificationsReadAction)}
      >
        {markAll.pending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCheck aria-hidden />}
        Mark all as read
      </Button>
      <ConfirmAction
        title="Clear read notifications?"
        description="Notifications you've already read will be deleted. Unread ones are kept."
        confirmLabel="Clear"
        action={clearReadNotificationsAction}
        trigger={
          <Button variant="outline" size="sm" disabled={read === 0}>
            <Trash2 aria-hidden /> Clear read
          </Button>
        }
      />
    </div>
  );
}
