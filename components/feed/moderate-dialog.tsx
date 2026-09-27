"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { moderateCommentAction, moderatePostAction } from "@/actions/posts";

/** Staff-only: remove (with a reason) or restore a post or comment. The server re-checks the permission. */
export function ModerateDialog({
  open,
  onOpenChange,
  kind,
  id,
  removed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "post" | "comment";
  id: string;
  /** Current state; the dialog performs the opposite. */
  removed: boolean;
}) {
  const action = kind === "post" ? moderatePostAction : moderateCommentAction;
  const { state, pending, fieldError, formProps } = useActionForm(action, {
    resetOnSuccess: true,
    onSuccess: () => onOpenChange(false),
  });
  const restoring = removed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {restoring ? "Restore" : "Remove"} this {kind}
          </DialogTitle>
          <DialogDescription>
            {restoring
              ? `The ${kind} will be visible to the batch again. This is recorded in the audit log.`
              : `The ${kind} will be hidden from students. Staff can still see and restore it. This is recorded in the audit log.`}
          </DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <input type="hidden" name={kind === "post" ? "postId" : "commentId"} value={id} />
          <input type="hidden" name="removed" value={restoring ? "false" : "true"} />
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          <FormField
            label={restoring ? "Note" : "Reason"}
            name="reason"
            hint="Optional, visible to staff only."
            error={fieldError("reason")}
          >
            {(f) => <Textarea {...f} maxLength={300} rows={2} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton pending={pending} variant={restoring ? "default" : "destructive"} pendingText="Saving…">
              {restoring ? "Restore" : "Remove"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
