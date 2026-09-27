"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { PasswordInput } from "@/components/shared/password-input";
import { useActionForm } from "@/hooks/use-action-form";
import { loginAction } from "@/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, fieldError, formProps } = useActionForm(loginAction, { toastSuccess: false });

  return (
    <form {...formProps} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormAlert message={!state.ok ? state.error : null} />
      <FormField label="Roll number" name="roll" error={fieldError("roll")} required>
        {(p) => <Input {...p} autoComplete="username" inputMode="numeric" placeholder="e.g. 240001" required autoFocus className="h-10" />}
      </FormField>
      <FormField
        label="Password"
        name="password"
        error={fieldError("password")}
        required
      >
        {(p) => <PasswordInput {...p} autoComplete="current-password" required className="h-10" />}
      </FormField>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" value="true" />
          <Label htmlFor="remember" className="text-sm font-normal">
            Keep me signed in
          </Label>
        </div>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={pending} pendingText="Signing in…" className="h-10 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
