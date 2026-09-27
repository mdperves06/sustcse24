"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { updateStudentAction } from "@/actions/admin-students";

export function EditStudentForm({
  id,
  roll,
  fullName,
  studentId,
  email,
  disabled,
}: {
  id: string;
  roll: string;
  fullName: string;
  studentId: string | null;
  email: string | null;
  disabled?: boolean;
}) {
  const { state, pending, fieldError, formProps } = useActionForm(updateStudentAction.bind(null, id));

  return (
    <form {...formProps} className="space-y-4">
      <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
      <FormField label="Roll" name="roll-readonly" hint="Rolls are permanent: they identify the account and are the default password.">
        {(f) => <Input {...f} name={undefined} value={roll} readOnly disabled className="font-mono" />}
      </FormField>
      <FormField label="Full name" name="fullName" error={fieldError("fullName")} required>
        {(f) => <Input {...f} defaultValue={fullName} required maxLength={100} disabled={disabled} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Student ID" name="studentId" error={fieldError("studentId")}>
          {(f) => <Input {...f} defaultValue={studentId ?? ""} maxLength={30} disabled={disabled} />}
        </FormField>
        <FormField label="Email" name="email" error={fieldError("email")}>
          {(f) => <Input {...f} type="email" defaultValue={email ?? ""} maxLength={200} disabled={disabled} />}
        </FormField>
      </div>
      {disabled ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" aria-hidden /> Restore the account to edit its details.
        </p>
      ) : (
        <div className="flex justify-end">
          <SubmitButton pending={pending}>Save details</SubmitButton>
        </div>
      )}
    </form>
  );
}
