"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlProps = { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/**
 * Accessible field wrapper: associates label, hint and error with the control.
 * Pass the control as a render function to receive the right ids/aria props.
 */
export function FormField({
  label,
  name,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  name: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText,
  className,
  variant,
  size,
  disabled,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  /** Pass the pending flag from useActionForm; falls back to the parent form's status. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} className={className} variant={variant} size={size}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}

export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
