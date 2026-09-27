"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { FormField, SubmitButton } from "@/components/shared/form";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useActionForm } from "@/hooks/use-action-form";
import { removeAvatarAction, removeCvAction, uploadAvatarAction, uploadCvAction } from "@/actions/profile";
import { fileUrl } from "@/lib/files";

export function MediaForms({
  name,
  avatarKey,
  cvKey,
  cvFileName,
}: {
  name: string;
  avatarKey: string | null;
  cvKey: string | null;
  cvFileName: string | null;
}) {
  const avatar = useActionForm(uploadAvatarAction, { resetOnSuccess: true });
  const cv = useActionForm(uploadCvAction, { resetOnSuccess: true });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile photo</CardTitle>
          <CardDescription>JPG, PNG or WebP, up to 2 MB. Visible to signed-in batch members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar name={name} avatarKey={avatarKey} size="xl" />
            {avatarKey ? (
              <ConfirmAction
                title="Remove profile photo?"
                confirmLabel="Remove"
                action={removeAvatarAction}
                trigger={
                  <Button variant="outline" size="sm">
                    <Trash2 aria-hidden /> Remove
                  </Button>
                }
              />
            ) : null}
          </div>
          <form {...avatar.formProps} className="space-y-3">
            <FormField label="New photo" name="avatar" error={avatar.fieldError("avatar")}>
              {(f) => <Input {...f} type="file" accept="image/jpeg,image/png,image/webp" required />}
            </FormField>
            <SubmitButton pending={avatar.pending} pendingText="Uploading…">
              <Upload aria-hidden /> Upload photo
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CV</CardTitle>
          <CardDescription>PDF up to 5 MB. Who can view it is set in the Privacy tab (default: only you).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cvKey ? (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileText className="size-5 text-primary" aria-hidden />
              <a href={fileUrl(cvKey)!} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {cvFileName ?? "CV.pdf"}
              </a>
              <ConfirmAction
                title="Remove your CV?"
                confirmLabel="Remove"
                action={removeCvAction}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Remove CV">
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No CV uploaded.</p>
          )}
          <form {...cv.formProps} className="space-y-3">
            <FormField label={cvKey ? "Replace CV" : "Upload CV"} name="cv" error={cv.fieldError("cv")}>
              {(f) => <Input {...f} type="file" accept="application/pdf" required />}
            </FormField>
            <SubmitButton pending={cv.pending} pendingText="Uploading…">
              <Upload aria-hidden /> Upload CV
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
