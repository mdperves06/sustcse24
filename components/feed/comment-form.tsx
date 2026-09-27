"use client";

import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useActionForm } from "@/hooks/use-action-form";
import { addCommentAction } from "@/actions/posts";
import { COMMENT_MAX_LENGTH } from "@/lib/validation/posts";

export function CommentForm({ postId, viewer }: { postId: string; viewer: { fullName: string; avatarKey: string | null } }) {
  const { state, pending, fieldError, formProps } = useActionForm(addCommentAction, { resetOnSuccess: true, toastSuccess: false });
  return (
    <form {...formProps} className="flex items-start gap-3">
      <input type="hidden" name="postId" value={postId} />
      <UserAvatar name={viewer.fullName} avatarKey={viewer.avatarKey} size="sm" className="mt-7 hidden sm:flex" />
      <div className="min-w-0 flex-1 space-y-2">
        <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
        <FormField label="Add a comment" name="content" error={fieldError("content")}>
          {(f) => (
            <Textarea
              {...f}
              required
              maxLength={COMMENT_MAX_LENGTH}
              rows={2}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          )}
        </FormField>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Ctrl + Enter to send</p>
          <SubmitButton pending={pending} size="sm" pendingText="Sending…">
            <Send aria-hidden /> Comment
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
