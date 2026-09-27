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
  onResult?: (data: T | undefined) => void,
) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        const result = await action(next);
        if (result.ok) onResult?.(result.data);
        else {
          setOn(!next);
          toast.error(result.error);
        }
      } catch {
        setOn(!next);
        toast.error("Network error — check your connection and try again.");
      }
    });
  }

  return { on, setOn, pending, toggle };
}
