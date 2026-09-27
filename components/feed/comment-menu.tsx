"use client";

import { useState } from "react";
import { Flag, MoreHorizontal, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/feed/confirm-dialog";
import { ModerateDialog } from "@/components/feed/moderate-dialog";
import { ReportDialog } from "@/components/feed/report-dialog";
import { deleteCommentAction } from "@/actions/posts";

export function CommentMenu({
  comment,
}: {
  comment: { id: string; removed: boolean; isAuthor: boolean; canDelete: boolean; canModerate: boolean; canReport: boolean };
}) {
  const [dialog, setDialog] = useState<null | "delete" | "report" | "moderate">(null);
  const close = (open: boolean) => !open && setDialog(null);
  if (!comment.canDelete && !comment.canReport && !comment.canModerate) return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="Comment actions">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {comment.canReport ? (
            <DropdownMenuItem onSelect={() => setDialog("report")}>
              <Flag aria-hidden /> Report
            </DropdownMenuItem>
          ) : null}
          {comment.canModerate ? (
            <DropdownMenuItem onSelect={() => setDialog("moderate")}>
              {comment.removed ? <RotateCcw aria-hidden /> : <ShieldAlert aria-hidden />}
              {comment.removed ? "Restore comment" : "Remove (moderate)"}
            </DropdownMenuItem>
          ) : null}
          {comment.canDelete ? (
            <>
              {comment.canReport || comment.canModerate ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2 aria-hidden /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {comment.canReport ? (
        <ReportDialog open={dialog === "report"} onOpenChange={close} targetType="COMMENT" targetId={comment.id} />
      ) : null}
      {comment.canModerate ? (
        <ModerateDialog open={dialog === "moderate"} onOpenChange={close} kind="comment" id={comment.id} removed={comment.removed} />
      ) : null}
      {comment.canDelete ? (
        <ConfirmDialog
          open={dialog === "delete"}
          onOpenChange={close}
          title="Delete this comment?"
          description={comment.isAuthor ? "This can't be undone." : "You're deleting someone else's comment as staff. This is audited."}
          confirmLabel="Delete"
          action={() => deleteCommentAction(comment.id)}
        />
      ) : null}
    </>
  );
}
