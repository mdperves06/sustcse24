"use client";

import { startTransition, useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/types/action";

type FormAction<T> = (prev: ActionResult<T>, formData: FormData) => Promise<ActionResult<T>>;

type Options<T> = {
  onSuccess?: (data: T | undefined) => void;
  /** Clear the form after a successful submit (for "create" forms). */
  resetOnSuccess?: boolean;
  /** Show a toast for successful results that carry a message (default: true). */
  toastSuccess?: boolean;
};

/**
 * Binds a server action to a <form> with pending state, toasts and per-field errors.
 * Submits via onSubmit (not the `action` prop) so React doesn't wipe the user's
 * input when the server returns validation errors.
 */
export function useActionForm<T = unknown>(action: FormAction<T>, options: Options<T> = {}) {
  const [state, dispatch, pending] = useActionState<ActionResult<T>, FormData>(action, { ok: true } as ActionResult<T>);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });

  useEffect(() => {
    if (!submitted.current) return;
    if (state.ok) {
      if (state.message && optsRef.current.toastSuccess !== false) toast.success(state.message);
      if (optsRef.current.resetOnSuccess) formRef.current?.reset();
      optsRef.current.onSuccess?.(state.data);
    } else {
      toast.error(state.error);
    }
  }, [state]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitted.current = true;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const fieldError = (name: string): string | undefined =>
    !state.ok ? state.fieldErrors?.[name]?.[0] : undefined;

  return { state, pending, fieldError, formProps: { ref: formRef, onSubmit, noValidate: false } };
}

/**
 * For buttons that call a server action directly (react, RSVP, bookmark…).
 * Wraps the call in a transition and surfaces the result as a toast.
 */
export function useServerAction() {
  const [pending, startActionTransition] = useTransition();

  function run<T>(
    fn: () => Promise<ActionResult<T>>,
    opts: { onSuccess?: (data: T | undefined) => void; quiet?: boolean } = {},
  ) {
    startActionTransition(async () => {
      try {
        const result = await fn();
        if (result.ok) {
          if (result.message && !opts.quiet) toast.success(result.message);
          opts.onSuccess?.(result.data);
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.error("Network error — check your connection and try again.");
      }
    });
  }

  return { pending, run };
}
