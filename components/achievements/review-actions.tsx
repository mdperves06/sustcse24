"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm, useServerAction } from "@/hooks/use-action-form";
import { rejectAchievementAction, revokeAchievementAction, verifyAchievementAction } from "@/actions/achievements";

export function ReviewActions({ id, title, canReview }: { id: string; title: string; canReview: boolean }) {
  const [open, setOpen] = useState(false);
  const verify = useServerAction();
  const reject = useActionForm(rejectAchievementAction.bind(null, id), { onSuccess: () => setOpen(false) });

  if (!canReview) {
    return <p className="text-xs text-muted-foreground">Your own submission — another reviewer must decide.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => verify.run(() => verifyAchievementAction(id))} disabled={verify.pending}>
        {verify.pending ? <Loader2 className="animate-spin" aria-hidden /> : <BadgeCheck aria-hidden />} Verify
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <XCircle aria-hidden /> Reject
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>“{title}” — the member will see your reason.</DialogDescription>
          </DialogHeader>
          <form {...reject.formProps} className="space-y-4">
            <FormAlert message={!reject.state.ok ? reject.state.error : null} />
            <FormField label="Reason" name="reason" error={reject.fieldError("reason")} required>
              {(f) => (
                <Textarea {...f} required rows={3} maxLength={500} placeholder="e.g. Please add a link to the official result page." />
              )}
            </FormField>
            <div className="flex justify-end">
              <SubmitButton pending={reject.pending} variant="destructive" pendingText="Rejecting…">
                Reject
              </SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RevokeButton({ id, title, status }: { id: string; title: string; status: "VERIFIED" | "REJECTED" }) {
  return (
    <ConfirmAction
      title={status === "VERIFIED" ? "Revoke verification?" : "Reopen this submission?"}
      description={`“${title}” goes back to the pending queue${status === "VERIFIED" ? " and leaves the Hall of Fame" : ""}.`}
      confirmLabel={status === "VERIFIED" ? "Revoke" : "Reopen"}
      action={() => revokeAchievementAction(id)}
      trigger={
        <Button variant="outline" size="sm">
          <RotateCcw aria-hidden /> {status === "VERIFIED" ? "Revoke" : "Reopen"}
        </Button>
      }
    />
  );
}
