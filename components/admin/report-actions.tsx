"use client";

import { useId, useState } from "react";
import { Ban, CheckCircle2, CircleCheck, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm, useServerAction } from "@/hooks/use-action-form";
import { decideReportAction, restrictAuthorAction } from "@/actions/admin-moderation";
import { liftRestrictionAction } from "@/actions/admin-students";

/** Review controls for one pending report: optional note + remove / resolve / dismiss. */
export function ReportActions({
  reportId,
  kind,
  contentGone,
}: {
  reportId: string;
  kind: "POST" | "COMMENT";
  /** The content was already removed or deleted by its author. */
  contentGone: boolean;
}) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const { pending, run } = useServerAction();
  const label = kind === "POST" ? "post" : "comment";
  const payload = (decision: "remove" | "resolve" | "dismiss") => ({ decision, note: note.trim() || undefined });

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={noteId} className="mb-1 block text-xs font-medium text-muted-foreground">
          Resolution note (optional, visible to staff)
        </Label>
        <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} />
      </div>
      <div className="flex flex-wrap gap-2">
        {contentGone ? null : (
          <ConfirmAction
            title={`Remove this ${label}?`}
            description={`The ${label} is hidden from everyone except staff and every pending report about it is resolved.`}
            confirmLabel={`Remove ${label}`}
            action={() => decideReportAction(reportId, payload("remove"))}
            trigger={
              <Button size="sm" variant="destructive" disabled={pending}>
                <Trash2 aria-hidden /> Remove content
              </Button>
            }
          />
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => decideReportAction(reportId, payload("resolve")))}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}
          Resolve without action
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => decideReportAction(reportId, payload("dismiss")))}>
          <XCircle aria-hidden /> Dismiss
        </Button>
      </div>
    </div>
  );
}

/** Dialog to restrict the reported author from posting for N days. */
export function RestrictAuthorDialog({ reportId, authorName }: { reportId: string; authorName: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, fieldError, formProps } = useActionForm(restrictAuthorAction.bind(null, reportId), {
    resetOnSuccess: true,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Ban aria-hidden /> Restrict author
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restrict {authorName}</DialogTitle>
          <DialogDescription>They can still read and react, but can&apos;t post or comment until the restriction ends.</DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          <FormField label="Days" name="days" error={fieldError("days")} required>
            {(f) => <Input {...f} type="number" min={1} max={365} defaultValue={3} required inputMode="numeric" />}
          </FormField>
          <FormField label="Reason" name="reason" error={fieldError("reason")} hint="Shown to the student when they try to post.">
            {(f) => <Textarea {...f} rows={2} maxLength={300} />}
          </FormField>
          <DialogFooter>
            <SubmitButton pending={pending} pendingText="Restricting…">
              Restrict posting
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LiftRestrictionButton({ userId, name }: { userId: string; name: string }) {
  return (
    <ConfirmAction
      destructive={false}
      title={`Lift ${name}'s restriction?`}
      description="They can post and comment again immediately."
      confirmLabel="Lift restriction"
      action={() => liftRestrictionAction(userId)}
      trigger={
        <Button size="sm" variant="outline">
          <CircleCheck aria-hidden /> Lift
        </Button>
      }
    />
  );
}
