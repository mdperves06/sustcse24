"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/types/action";

/**
 * Optimistic on/off toggle backed by a server action (like, bookmark, save).
 * Rolls back and shows a toast when the server rejects the change.
 */
export function useOptimisticToggle<T>(
  initial: boolean,
  action: (next: boolean) => Promise<ActionResult<T>>,
  opts: { onChange?: (next: boolean) => void; onSuccess?: (data: T | undefined) => void; onRevert?: (value: boolean) => void } = {},
) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function revert(value: boolean, message: string) {
    setOn(value);
    opts.onRevert?.(value);
    toast.error(message);
  }

  function toggle() {
    const next = !on;
    setOn(next);
    opts.onChange?.(next);
    startTransition(async () => {
      try {
        const result = await action(next);
        if (result.ok) {
          if (result.message) toast.success(result.message);
          opts.onSuccess?.(result.data);
        } else revert(!next, result.error);
      } catch {
        revert(!next, "Network error — check your connection and try again.");
      }
    });
  }

  return { on, pending, toggle };
}
