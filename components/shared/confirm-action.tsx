"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-action-form";
import type { ActionResult } from "@/types/action";

/** A button that asks for confirmation, then runs a server action. Used for all destructive actions. */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  action,
  onDone,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  action: () => Promise<ActionResult<unknown>>;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useServerAction();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
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
                  setOpen(false);
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
