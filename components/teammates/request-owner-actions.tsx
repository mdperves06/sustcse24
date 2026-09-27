"use client";

import { Lock, LockOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useServerAction } from "@/hooks/use-action-form";
import { deleteTeammateRequestAction, setTeammateRequestStatusAction } from "@/actions/teammates";

export function RequestOwnerActions({
  id,
  title,
  open,
  isOwner,
}: {
  id: string;
  title: string;
  open: boolean;
  isOwner: boolean;
}) {
  const { pending, run } = useServerAction();
  return (
    <div className="flex flex-wrap gap-1">
      {isOwner ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setTeammateRequestStatusAction(id, !open))}>
          {open ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
          {open ? "Close" : "Reopen"}
        </Button>
      ) : null}
      <ConfirmAction
        title="Delete this request?"
        description={`“${title}” will be removed.`}
        confirmLabel="Delete"
        action={() => deleteTeammateRequestAction(id)}
        trigger={
          <Button variant="ghost" size="sm" aria-label={`Delete ${title}`}>
            <Trash2 aria-hidden /> {isOwner ? "Delete" : "Remove"}
          </Button>
        }
      />
    </div>
  );
}
