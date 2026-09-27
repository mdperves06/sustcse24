"use client";

import { Ban, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm, useServerAction } from "@/hooks/use-action-form";
import { liftRestrictionAction, restrictStudentAction } from "@/actions/admin-students";
import type { ActionResult } from "@/types/action";

/** Restrict posting until a date (Dhaka time), or lift an active restriction. */
export function RestrictionForm({
  id,
  restrictedUntil,
  restrictedUntilLabel,
  reason,
  minDate,
  disabled,
}: {
  id: string;
  restrictedUntil: string | null;
  restrictedUntilLabel: string | null;
  reason: string | null;
  /** Earliest selectable date (YYYY-MM-DD, tomorrow in Dhaka). */
  minDate: string;
  disabled?: boolean;
}) {
  const { pending, fieldError, formProps } = useActionForm(restrictStudentAction.bind(null, id));
  const lift = useServerAction();

  return (
    <div className="space-y-4">
      {restrictedUntil ? (
        <div className="flex flex-col gap-3 rounded-xl border border-chart-4/30 bg-chart-4/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">Restricted until {restrictedUntilLabel}</p>
            {reason ? <p className="text-xs text-muted-foreground">Reason: {reason}</p> : null}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={lift.pending || disabled}
            onClick={() => lift.run((): Promise<ActionResult> => liftRestrictionAction(id))}
          >
            <CircleCheck aria-hidden /> Lift restriction
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This account can post and comment normally.</p>
      )}

      <form {...formProps} className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <FormField label={restrictedUntil ? "Change end date" : "Restrict until"} name="until" error={fieldError("until")} required>
          {(f) => <Input {...f} type="date" min={minDate} required disabled={disabled} />}
        </FormField>
        <FormField label="Reason" name="reason" error={fieldError("reason")} hint="Shown to the student when they try to post.">
          {(f) => <Textarea {...f} rows={2} maxLength={300} defaultValue={reason ?? ""} disabled={disabled} />}
        </FormField>
        <div className="flex justify-end sm:col-span-2">
          <SubmitButton pending={pending} variant="outline" disabled={disabled}>
            <Ban aria-hidden /> {restrictedUntil ? "Update restriction" : "Restrict posting"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
