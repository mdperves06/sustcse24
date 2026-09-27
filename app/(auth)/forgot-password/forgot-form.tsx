"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { forgotPasswordAction } from "@/actions/auth";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const { state, pending, fieldError, formProps } = useActionForm(forgotPasswordAction, {
    toastSuccess: false,
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div role="status" className="flex gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <p>{state.ok ? state.message : null}</p>
      </div>
    );
  }

  return (
    <form {...formProps} className="space-y-4">
      <FormAlert message={!state.ok ? state.error : null} />
      <FormField label="Roll or email" name="identifier" error={fieldError("identifier")} required>
        {(p) => <Input {...p} autoComplete="username" required autoFocus />}
      </FormField>
      <SubmitButton pending={pending} pendingText="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
