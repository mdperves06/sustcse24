"use client";

import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { PasswordInput } from "@/components/shared/password-input";
import { useActionForm } from "@/hooks/use-action-form";
import { changePasswordAction } from "@/actions/auth";

export function ChangePasswordForm() {
  const { state, pending, fieldError, formProps } = useActionForm(changePasswordAction, { resetOnSuccess: true });

  return (
    <form {...formProps} className="space-y-4">
      <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
      <FormField label="Current password" name="currentPassword" error={fieldError("currentPassword")} required>
        {(p) => <PasswordInput {...p} autoComplete="current-password" required />}
      </FormField>
      <FormField
        label="New password"
        name="newPassword"
        hint="At least 8 characters with a letter and a number. Can't be your roll."
        error={fieldError("newPassword")}
        required
      >
        {(p) => <PasswordInput {...p} autoComplete="new-password" minLength={8} required />}
      </FormField>
      <FormField label="Confirm new password" name="confirmPassword" error={fieldError("confirmPassword")} required>
        {(p) => <PasswordInput {...p} autoComplete="new-password" required />}
      </FormField>
      <SubmitButton pending={pending} pendingText="Updating…" className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}
