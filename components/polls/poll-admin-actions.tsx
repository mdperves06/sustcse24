"use client";

import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feed/confirm-dialog";
import { closePollAction, deletePollAction } from "@/actions/polls";

export function PollAdminActions({ pollId, canClose }: { pollId: string; canClose: boolean }) {
  const [dialog, setDialog] = useState<null | "close" | "delete">(null);
  const close = (open: boolean) => !open && setDialog(null);
  return (
    <div className="flex flex-wrap gap-2">
      {canClose ? (
        <Button variant="outline" size="sm" onClick={() => setDialog("close")}>
          <Lock aria-hidden /> Close now
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDialog("delete")}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={close}
        title="Close this poll now?"
        description="No more votes will be accepted and everyone will see the results."
        confirmLabel="Close poll"
        destructive={false}
        action={() => closePollAction(pollId)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title="Delete this poll?"
        description="The poll and its results will be hidden from everyone. This is recorded in the audit log."
        confirmLabel="Delete poll"
        action={() => deletePollAction(pollId)}
      />
    </div>
  );
}
