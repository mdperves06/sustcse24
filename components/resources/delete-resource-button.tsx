"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { deleteResourceAction } from "@/actions/resources";

export function DeleteResourceButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      title="Delete this resource?"
      description={`“${title}” will be removed for everyone.`}
      confirmLabel="Delete"
      action={() => deleteResourceAction(id)}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`}>
          <Trash2 aria-hidden />
        </Button>
      }
    />
  );
}
