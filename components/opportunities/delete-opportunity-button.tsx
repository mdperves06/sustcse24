"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { deleteOpportunityAction } from "@/actions/opportunities";

export function DeleteOpportunityButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      title="Delete this opportunity?"
      description={`“${title}” will be removed from the board.`}
      confirmLabel="Delete"
      action={() => deleteOpportunityAction(id)}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`}>
          <Trash2 aria-hidden />
        </Button>
      }
    />
  );
}
