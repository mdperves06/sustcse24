"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-action-form";
import type { ActionResult } from "@/types/action";

/** Controlled confirmation dialog — for destructive actions opened from menus (where a trigger button doesn't fit). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  action,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  action: () => Promise<ActionResult<unknown>>;
  onDone?: () => void;
}) {
  const { pending, run } = useServerAction();
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              run(action, {
                onSuccess: () => {
                  onOpenChange(false);
                  onDone?.();
                },
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
