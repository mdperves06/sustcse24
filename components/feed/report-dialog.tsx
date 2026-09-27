"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { reportContentAction } from "@/actions/posts";
import { REPORT_REASONS } from "@/lib/validation/posts";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "POST" | "COMMENT";
  targetId: string;
}) {
  const { state, pending, fieldError, formProps } = useActionForm(reportContentAction, {
    resetOnSuccess: true,
    onSuccess: () => onOpenChange(false),
  });
  const noun = targetType === "POST" ? "post" : "comment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {noun}</DialogTitle>
          <DialogDescription>
            Reports are private: only moderators see who sent them. Use this for content that breaks the batch guidelines.
          </DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          <FormField label="Reason" name="reason" error={fieldError("reason")} required>
            {(f) => (
              <NativeSelect {...f} defaultValue="" required className="w-full">
                <NativeSelectOption value="" disabled>
                  Choose a reason…
                </NativeSelectOption>
                {REPORT_REASONS.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {r}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            label="Details"
            name="details"
            hint="Optional. Anything that helps moderators understand the problem."
            error={fieldError("details")}
          >
            {(f) => <Textarea {...f} maxLength={1000} rows={3} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton pending={pending} pendingText="Sending…">
              Send report
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
