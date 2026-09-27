"use client";

import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { PasswordInput } from "@/components/shared/password-input";
import { useActionForm } from "@/hooks/use-action-form";
import { resetPasswordAction } from "@/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const { state, pending, fieldError, formProps } = useActionForm(resetPasswordAction);

  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
      <FormField
        label="New password"
        name="newPassword"
        hint="At least 8 characters with a letter and a number."
        error={fieldError("newPassword")}
        required
      >
        {(p) => <PasswordInput {...p} autoComplete="new-password" minLength={8} required autoFocus />}
      </FormField>
      <FormField label="Confirm new password" name="confirmPassword" error={fieldError("confirmPassword")} required>
        {(p) => <PasswordInput {...p} autoComplete="new-password" required />}
      </FormField>
      <SubmitButton pending={pending} pendingText="Saving…" className="w-full">
        Save new password
      </SubmitButton>
    </form>
  );
}
