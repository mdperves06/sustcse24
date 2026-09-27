"use client";

import { Globe2, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { updatePrivacyAction } from "@/actions/profile";
import { PRIVACY_FIELDS, type PrivacyFlags } from "@/lib/privacy";
import { cn } from "@/lib/utils";

export function PrivacyForm({ privacy }: { privacy: PrivacyFlags }) {
  const { pending, formProps } = useActionForm(updatePrivacyAction);

  return (
    <form {...formProps}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden /> Who can see your details
          </CardTitle>
          <CardDescription>
            Nothing is ever public — the whole platform requires sign-in. “Batch” means signed-in CSE 24 members; “Only
            me” hides the field from everyone else, including search filters, the AI assistant and statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {PRIVACY_FIELDS.map((field) => (
              <li key={field.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p id={`${field.key}-label`} className="text-sm font-medium">
                    {field.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <fieldset aria-labelledby={`${field.key}-label`} className="inline-flex shrink-0 rounded-lg border p-0.5">
                  {(
                    [
                      ["BATCH", "Batch", Globe2],
                      ["PRIVATE", "Only me", Lock],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
                        "has-[:checked]:bg-secondary has-[:checked]:text-secondary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      )}
                    >
                      <input type="radio" name={field.key} value={value} defaultChecked={privacy[field.key] === value} className="sr-only" />
                      <Icon className="size-3.5" aria-hidden />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <SubmitButton pending={pending}>Save privacy settings</SubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
