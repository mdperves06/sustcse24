"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, MoreHorizontal, Pencil, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormAlert, SubmitButton } from "@/components/shared/form";
import { ConfirmDialog } from "@/components/feed/confirm-dialog";
import { ModerateDialog } from "@/components/feed/moderate-dialog";
import { PostFields } from "@/components/feed/post-fields";
import { ReportDialog } from "@/components/feed/report-dialog";
import { useActionForm } from "@/hooks/use-action-form";
import { deletePostAction, updatePostAction } from "@/actions/posts";
import type { PostType } from "@/lib/generated/prisma/enums";

type MenuPost = {
  id: string;
  type: PostType;
  content: string;
  linkUrl: string | null;
  removed: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  canReport: boolean;
  isAuthor: boolean;
};

function EditPostDialog({
  post,
  open,
  onOpenChange,
  allowAnnouncement,
}: {
  post: MenuPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowAnnouncement: boolean;
}) {
  const { state, pending, fieldError, formProps } = useActionForm(updatePostAction, {
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
          <DialogDescription>Edited posts show an “edited” marker. Images can&apos;t be changed.</DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <input type="hidden" name="postId" value={post.id} />
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          <PostFields
            fieldError={fieldError}
            allowAnnouncement={allowAnnouncement}
            defaults={{ type: post.type, content: post.content, linkUrl: post.linkUrl }}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton pending={pending}>Save changes</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Per-post actions. Items only appear when the server said the viewer may perform them (and it re-checks). */
export function PostMenu({
  post,
  allowAnnouncement,
  redirectOnDelete,
}: {
  post: MenuPost;
  allowAnnouncement: boolean;
  redirectOnDelete?: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "edit" | "delete" | "report" | "moderate">(null);
  const close = (open: boolean) => !open && setDialog(null);

  const hasItems = post.canEdit || post.canDelete || post.canReport || post.canModerate;
  if (!hasItems) return null;

  return (
    <>
      {/* Non-modal so the dialogs opened from it get focus and pointer events cleanly. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Post actions">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {post.canEdit ? (
            <DropdownMenuItem onSelect={() => setDialog("edit")}>
              <Pencil aria-hidden /> Edit
            </DropdownMenuItem>
          ) : null}
          {post.canReport ? (
            <DropdownMenuItem onSelect={() => setDialog("report")}>
              <Flag aria-hidden /> Report
            </DropdownMenuItem>
          ) : null}
          {post.canModerate ? (
            <DropdownMenuItem onSelect={() => setDialog("moderate")}>
              {post.removed ? <RotateCcw aria-hidden /> : <ShieldAlert aria-hidden />}
              {post.removed ? "Restore post" : "Remove (moderate)"}
            </DropdownMenuItem>
          ) : null}
          {post.canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2 aria-hidden /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {post.canEdit ? (
        <EditPostDialog post={post} open={dialog === "edit"} onOpenChange={close} allowAnnouncement={allowAnnouncement} />
      ) : null}
      {post.canReport ? (
        <ReportDialog open={dialog === "report"} onOpenChange={close} targetType="POST" targetId={post.id} />
      ) : null}
      {post.canModerate ? (
        <ModerateDialog open={dialog === "moderate"} onOpenChange={close} kind="post" id={post.id} removed={post.removed} />
      ) : null}
      {post.canDelete ? (
        <ConfirmDialog
          open={dialog === "delete"}
          onOpenChange={close}
          title="Delete this post?"
          description={
            post.isAuthor
              ? "The post, its comments and reactions will disappear from the feed."
              : "You're deleting someone else's post as staff. This is recorded in the audit log."
          }
          confirmLabel="Delete"
          action={() => deletePostAction(post.id)}
          onDone={redirectOnDelete ? () => router.push(redirectOnDelete) : undefined}
        />
      ) : null}
    </>
  );
}
